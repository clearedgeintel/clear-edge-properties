import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAdmin, requireAuth, requireSubscription } from "./middleware";
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
    // Where the add came from, recorded in the deal's activity history.
    origin: z.string().max(40).optional(),
    savedSearchId: z.string().uuid().optional(),
  })
  .refine((b) => b.zpid || b.result, { message: "zpid or result is required" });

// ---- Activity history ----

type Ctx = { tenantId: string; userId: string };

const stageName = (stages: { id: string; name: string }[], id: string | null | undefined) =>
  id ? stages.find((s) => s.id === id)?.name ?? "Unknown stage" : null;

// Logs a stage transition. Never throws: history must not break the action.
async function logStageChange(
  ctx: Ctx,
  dealId: string,
  fromId: string | null,
  toId: string | null,
  stages: { id: string; name: string }[],
) {
  if (fromId === toId) return;
  const from = stageName(stages, fromId);
  const to = stageName(stages, toId);
  const [activityType, title] = !toId
    ? ["removed_from_pipeline", `Removed from pipeline${from ? ` (was ${from})` : ""}`]
    : !fromId
      ? ["added_to_pipeline", `Added to ${to}`]
      : ["stage_changed", `Moved from ${from} to ${to}`];
  await storage
    .addPropertyActivity({
      ...ctx,
      userPropertyId: dealId,
      activityType,
      title,
      metadata: { fromStageId: fromId, toStageId: toId, fromStage: from, toStage: to },
    })
    .catch((e) => console.error("Activity log error:", e));
}

router.post('/api/deals', requireAuth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.ctx;
    const ctx: Ctx = { tenantId, userId };
    const body = createDealSchema.parse(req.body);

    let zpid = body.zpid ?? "";
    if (body.result) {
      const result = body.result as unknown as SearchResult;
      const insert = toInsertProperty(result, body.searchMarket);
      if (!insert.zpid) return res.status(400).json({ error: "Result has no id" });
      zpid = insert.zpid;
    } else if (!(await storage.getProperty(zpid))) {
      return res.status(404).json({ error: "Property not found" });
    }

    const wasTracked = await storage.isUserProperty(tenantId, userId, zpid);

    if (body.result) {
      const result = body.result as unknown as SearchResult;
      // Upserts the catalog row and tracks it for this user.
      const saved = await storage.saveSearchResults(tenantId, userId, [toInsertProperty(result, body.searchMarket)]);
      if (saved.newZpids.includes(zpid)) {
        void enrichFirstImports(
          [{ zpid, platform: result.platform, score: result.score ?? null }],
          DEFAULT_ENRICH_SCORE_THRESHOLD,
        ).catch((e) => console.error("Background enrichment error:", e));
      }
    } else {
      await storage.addUserProperty(tenantId, userId, zpid);
    }

    const tracked = (await storage.getUserProperties(tenantId, userId)).find((d) => d.zpid === zpid);
    if (!tracked) return res.status(500).json({ error: "Failed to track property" });

    const stages = await storage.getPipelineStages(tenantId);
    let stageId: string | null | undefined;
    if (body.pipelineStageId === null) {
      stageId = null;
    } else if (body.pipelineStageId) {
      if (!stages.some((s) => s.id === body.pipelineStageId)) {
        return res.status(400).json({ error: "Unknown pipeline stage" });
      }
      stageId = body.pipelineStageId;
    } else if (!tracked.pipelineStageId) {
      stageId = stages[0]?.id ?? null;
    }

    if (!wasTracked) {
      const source = body.savedSearchId ? "saved search" : body.origin ?? (body.result ? "search" : "catalog");
      const platform = body.result?.platform;
      await storage
        .addPropertyActivity({
          ...ctx,
          userPropertyId: tracked.id,
          activityType: "saved",
          title: `Saved from ${source}${platform ? ` (${platform})` : ""}`,
          metadata: { origin: source, platform: platform ?? null, savedSearchId: body.savedSearchId ?? null },
        })
        .catch((e) => console.error("Activity log error:", e));
    }

    if (stageId !== undefined && stageId !== tracked.pipelineStageId) {
      const updated = await storage.updateUserProperty(tenantId, tracked.id, { pipelineStageId: stageId });
      await logStageChange(ctx, tracked.id, tracked.pipelineStageId ?? null, stageId, stages);
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
    const { tenantId, userId } = req.ctx;
    const id = req.params.id;
    const updates = updateUserPropertySchema.parse(req.body);
    const before = await storage.getUserPropertyById(tenantId, id);
    if (!before) return res.status(404).json({ error: "Deal not found" });

    const deal = await storage.updateUserProperty(tenantId, id, updates);

    if ("pipelineStageId" in updates) {
      const stages = await storage.getPipelineStages(tenantId);
      await logStageChange({ tenantId, userId }, id, before.pipelineStageId ?? null, updates.pipelineStageId ?? null, stages);
    }
    if ("customNotes" in updates && (updates.customNotes ?? "") !== (before.customNotes ?? "")) {
      await storage
        .addPropertyActivity({
          tenantId,
          userId,
          userPropertyId: id,
          activityType: "note_updated",
          title: updates.customNotes ? "Notes updated" : "Notes cleared",
          description: updates.customNotes ? String(updates.customNotes).slice(0, 280) : null,
        })
        .catch((e) => console.error("Activity log error:", e));
    }
    res.json(deal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// A deal's activity history, newest first.
router.get('/api/deals/:id/activities', requireAuth, async (req: any, res) => {
  try {
    const { tenantId } = req.ctx;
    const deal = await storage.getUserPropertyById(tenantId, req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(await storage.getPropertyActivities(tenantId, deal.id));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---- Pipeline stage management (owner/admin) ----

const stageFields = {
  name: z.string().trim().min(1, "Name is required").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #3B82F6").nullable().optional(),
  icon: z.string().max(8).nullable().optional(),
};

// Postgres unique violation → a friendly 409 (stage names are unique per tenant).
function stageError(res: any, error: any) {
  if (error?.code === "23505" || /duplicate key/i.test(error?.message ?? "")) {
    return res.status(409).json({ error: "A stage with that name already exists" });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message ?? "Invalid stage" });
  }
  return res.status(400).json({ error: error.message });
}

router.post('/api/pipeline-stages', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const values = z.object(stageFields).parse(req.body);
    res.json(await storage.createPipelineStage(req.ctx.tenantId, values));
  } catch (error: any) {
    stageError(res, error);
  }
});

// Must be registered before /:id so "order" isn't read as an id.
router.put('/api/pipeline-stages/order', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(req.body);
    res.json(await storage.reorderPipelineStages(req.ctx.tenantId, ids));
  } catch (error: any) {
    stageError(res, error);
  }
});

router.patch('/api/pipeline-stages/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const values = z.object(stageFields).partial().parse(req.body);
    const stage = await storage.updatePipelineStage(req.ctx.tenantId, req.params.id, values);
    if (!stage) return res.status(404).json({ error: "Stage not found" });
    res.json(stage);
  } catch (error: any) {
    stageError(res, error);
  }
});

// Deals in the stage move to ?moveTo=<stageId>, or back to "saved" if omitted.
router.delete('/api/pipeline-stages/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { tenantId } = req.ctx;
    const stages = await storage.getPipelineStages(tenantId);
    if (!stages.some((s) => s.id === req.params.id)) return res.status(404).json({ error: "Stage not found" });
    if (stages.length <= 1) return res.status(400).json({ error: "Your pipeline needs at least one stage" });
    const moveTo = typeof req.query.moveTo === "string" && req.query.moveTo ? req.query.moveTo : null;
    if (moveTo && (moveTo === req.params.id || !stages.some((s) => s.id === moveTo))) {
      return res.status(400).json({ error: "Choose a different stage to move deals to" });
    }
    const { moved, movedIds } = await storage.deletePipelineStage(tenantId, req.params.id, moveTo);
    // Record the forced move on each affected deal's history.
    const deleted = stages.find((s) => s.id === req.params.id)!;
    const target = stageName(stages, moveTo);
    await Promise.all(
      movedIds.map((dealId) =>
        storage
          .addPropertyActivity({
            tenantId,
            userId: req.ctx.userId,
            userPropertyId: dealId,
            activityType: moveTo ? "stage_changed" : "removed_from_pipeline",
            title: moveTo
              ? `Moved from ${deleted.name} to ${target} (stage deleted)`
              : `Removed from pipeline (stage ${deleted.name} deleted)`,
            metadata: { fromStageId: deleted.id, toStageId: moveTo, fromStage: deleted.name, toStage: target },
          })
          .catch((e) => console.error("Activity log error:", e)),
      ),
    );
    res.json({ moved });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
