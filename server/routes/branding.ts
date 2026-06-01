import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "./middleware";
import { upsertBrandingSchema } from "@shared/schema";

const router = Router();

// White-label branding routes (per tenant)
router.get('/api/branding', requireAuth, async (req: any, res) => {
  try {
    const branding = await storage.getTenantBranding(req.ctx.tenantId);
    res.json(branding || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert branding for the current tenant. POST and PATCH both upsert since
// branding is unique per tenant (insert-or-update on conflict).
router.post('/api/branding', requireAuth, async (req: any, res) => {
  try {
    const updates = upsertBrandingSchema.parse(req.body);
    const branding = await storage.upsertTenantBranding(req.ctx.tenantId, updates);
    res.json(branding);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/api/branding', requireAuth, async (req: any, res) => {
  try {
    const updates = upsertBrandingSchema.parse(req.body);
    const branding = await storage.upsertTenantBranding(req.ctx.tenantId, updates);
    res.json(branding);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/branding', requireAuth, async (req: any, res) => {
  try {
    await storage.deleteTenantBranding(req.ctx.tenantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
