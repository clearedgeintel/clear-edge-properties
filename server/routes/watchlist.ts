import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth, requireSubscription } from "./middleware";
import { updateUserPropertySchema } from "@shared/schema";

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
