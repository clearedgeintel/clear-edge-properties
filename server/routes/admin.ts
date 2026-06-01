import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "./middleware";
import { propertySearchSchema } from "@shared/schema";

// ---------------------------------------------------------------------------
// Admin router — re-platformed onto the multi-tenant Supabase model.
//
// The legacy scraping / zip-code-job / job-schedule / bulk-update / archive /
// subscription-package / CSV+Excel ingest subsystems were RETIRED (properties
// are now read-only in the app and bulk-ingested by n8n; createProperty/
// updateProperty/deleteProperty no longer exist). Those endpoints were removed.
//
// What remains is a minimal admin surface backed by the new storage contract:
//   - browse the shared property catalogue (read-only)
//   - inspect the current tenant + its subscription status / configured limits
//   - read the tenant's pipeline stages
// Everything is scoped to req.ctx.tenantId and gated by requireAdmin.
// ---------------------------------------------------------------------------

const router = Router();

// Browse the property catalogue (read-only). Properties are global/shared and
// ingested out-of-band; admins can search the full catalogue here.
router.get(
  "/api/admin/properties",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const searchParams = propertySearchSchema.parse(req.query);
      const properties = await storage.getProperties(searchParams);
      res.json(properties);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

// Current tenant overview, including subscription status and configured limits.
// (Subscription status / Stripe info now live on the tenant, not the user.)
router.get(
  "/api/admin/tenant",
  requireAuth,
  requireAdmin,
  async (req: any, res: Response) => {
    try {
      const tenant = await storage.getTenant(req.ctx.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscriptionTier: tenant.subscriptionTier,
        subscriptionStatus: tenant.subscriptionStatus,
        maxUsers: tenant.maxUsers,
        maxTrackedProperties: tenant.maxTrackedProperties,
        maxSearchesPerMonth: tenant.maxSearchesPerMonth,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Pipeline stages configured for the current tenant.
router.get(
  "/api/admin/pipeline-stages",
  requireAuth,
  requireAdmin,
  async (req: any, res: Response) => {
    try {
      const stages = await storage.getPipelineStages(req.ctx.tenantId);
      res.json(stages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
