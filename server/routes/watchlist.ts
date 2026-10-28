import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth, requireSubscription } from "./middleware";
import { updateUserPropertySchema } from "@shared/schema";
import { searchResultZpid } from "@shared/search-ids";
import { toInsertProperty, type SearchResult } from "../lib/multi-platform-search";
import { enrichFirstImports, DEFAULT_ENRICH_SCORE_THRESHOLD } from "../lib/enrichment";

const router = Router();

// "Watchlist" is now backed by user_properties (tracked properties), keyed by
// zpid and scoped to the authenticated user's tenant + user. Route paths are
// preserved so existing clients keep working; the :propertyId / body fields are
// now zpid strings rather than integer property IDs.

const addBodySchema = z.union([
  z.object({ zpid: z.string().min(1) }),
  // Legacy clients may still send `propertyId`; treat it as the zpid.
  z.object({ propertyId: z.union([z.string(), z.number()]).transform((v) => String(v)) }),
  // Bulk add.
  z.object({ zpids: z.array(z.union([z.string(), z.number()]).transform((v) => String(v))).min(1) }),
]);

// List tracked properties for the current user.
router.get('/api/watchlist', requireAuth, requireSubscription, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.ctx;
    const properties = await storage.getUserProperties(tenantId, userId);
    res.json(properties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add a single property (zpid / propertyId) or bulk add (zpids[]).
router.post('/api/watchlist', requireAuth, requireSubscription, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.ctx;
    const body = addBodySchema.parse(req.body);

    // Bulk add.
    if ("zpids" in body) {
      const items = await storage.addUserProperties(tenantId, userId, body.zpids);
      return res.json(items);
    }

    const zpid = "zpid" in body ? body.zpid : body.propertyId;

    // Verify the property exists before tracking it.
    const property = await storage.getProperty(zpid);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const item = await storage.addUserProperty(tenantId, userId, zpid);
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove a tracked property by zpid.
router.delete('/api/watchlist/:propertyId', requireAuth, requireSubscription, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.ctx;
    const zpid = req.params.propertyId;
    await storage.removeUserProperty(tenantId, userId, zpid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Check whether a property (zpid) is tracked by the current user.
router.get('/api/watchlist/:propertyId/check', requireAuth, requireSubscription, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.ctx;
    const zpid = req.params.propertyId;
    const inWatchlist = await storage.isUserProperty(tenantId, userId, zpid);
    res.json({ inWatchlist });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Deals = tracked properties enriched with their property record.
// The tenant's pipeline stages (board columns), ordered.
router.get('/api/pipeline-stages', requireAuth, async (req: any, res) => {
  try {
    const stages = await storage.getPipelineStages(req.ctx.tenantId);
    res.json(stages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/deals', requireAuth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.ctx;
    const tracked = await storage.getUserProperties(tenantId, userId);
    const deals = tracked.map((item) => ({
      ...item,
      property: item.property,
    }));
    res.json(deals);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Create (or update) a deal from anywhere: a catalog property by zpid, or a
// live search result that isn't in the catalog yet (it's upserted first, the
// same way POST /api/search/save does). One call takes a property from search
// straight onto the board.
//   pipelineStageId omitted → first stage (but never moves an existing deal)
//   pipelineStageId null    → save only (tracked, not on the board)
//   pipelineStageId <uuid>  → that stage (must belong to the tenant)
const createDealSchema = z
  .object({
    zpid: z.string().min(1).optional(),
    result: z
      .object({ id: z.union([z.string(), z.number()]), platform: z.string().min(1) })
      .passthrough()
      .optional(),
    searchMarket: z.string().optional(),
    pipelineStageId: z.string().uuid().nullable().optional(),
  })
  .refine((b) => b.zpid || b.result, { message: "zpid or result is required" });

router.post('/api/deals', requireAuth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.ctx;
    const body = createDealSchema.parse(req.body);

    let zpid = body.zpid ?? "";
    if (body.result) {
      const result = body.result as unknown as SearchResult;
      const insert = toInsertProperty(result, body.searchMarket);
      if (!insert.zpid) return res.status(400).json({ error: "Result has no id" });
      zpid = insert.zpid;
      // Upserts the catalog row and tracks it for this user.
      const saved = await storage.saveSearchResults(tenantId, userId, [insert]);
      if (saved.newZpids.includes(zpid)) {
        void enrichFirstImports(
          [{ zpid, platform: result.platform, score: result.score ?? null }],
          DEFAULT_ENRICH_SCORE_THRESHOLD,
        ).catch((e) => console.error("Background enrichment error:", e));
      }
    } else {
      if (!(await storage.getProperty(zpid))) {
        return res.status(404).json({ error: "Property not found" });
      }
      await storage.addUserProperty(tenantId, userId, zpid);
    }

    const tracked = (await storage.getUserProperties(tenantId, userId)).find((d) => d.zpid === zpid);
    if (!tracked) return res.status(500).json({ error: "Failed to track property" });

    let stageId: string | null | undefined;
    if (body.pipelineStageId === null) {
      stageId = null;
    } else if (body.pipelineStageId) {
      const stages = await storage.getPipelineStages(tenantId);
      if (!stages.some((s) => s.id === body.pipelineStageId)) {
        return res.status(400).json({ error: "Unknown pipeline stage" });
      }
      stageId = body.pipelineStageId;
    } else if (!tracked.pipelineStageId) {
      const [first] = await storage.getPipelineStages(tenantId);
      stageId = first?.id ?? null;
    }

    if (stageId !== undefined && stageId !== tracked.pipelineStageId) {
      const updated = await storage.updateUserProperty(tenantId, tracked.id, { pipelineStageId: stageId });
      return res.json({ ...updated, property: tracked.property });
    }
    res.json(tracked);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update status / notes / pipeline stage / tags / favorite for a tracked
// property. The :id is the user_properties uuid (scoped to the tenant).
router.patch('/api/deals/:id', requireAuth, async (req: any, res) => {
  try {
    const { tenantId } = req.ctx;
    const id = req.params.id;
    const updates = updateUserPropertySchema.parse(req.body);
    const deal = await storage.updateUserProperty(tenantId, id, updates);
    res.json(deal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
