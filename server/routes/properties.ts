import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAuth, requireSubscription } from "./middleware";
import { propertySearchSchema } from "@shared/schema";

const router = Router();

// ---------------------------------------------------------------------------
// Properties route — re-platformed onto Supabase (multi-tenant, zpid-keyed).
// Properties themselves are a shared, read-only catalog (written by n8n); they
// are NOT tenant-scoped. Saving/tracking a property lives in the search group
// (user_properties), not here. Query parsing uses the PropertySearch zod schema.
// ---------------------------------------------------------------------------

// Coerce raw query-string values (always strings) into the shapes the
// propertySearchSchema expects (numbers for the numeric filters).
function parsePropertySearch(query: Record<string, any>) {
  const num = (v: unknown) =>
    v === undefined || v === "" ? undefined : Number(v);
  return propertySearchSchema.parse({
    query: query.query,
    market: query.market,
    city: query.city,
    state: query.state,
    zip: query.zip,
    priceMin: num(query.priceMin),
    priceMax: num(query.priceMax),
    scoreMin: num(query.scoreMin),
    scoreMax: num(query.scoreMax),
    bedsMin: num(query.bedsMin),
    homeType: query.homeType,
    sortBy: query.sortBy,
    limit: num(query.limit),
    offset: num(query.offset),
  });
}

// Property browse/list — authenticated, subscription-gated.
router.get(
  "/api/properties",
  requireAuth,
  requireSubscription,
  async (req: Request, res: Response) => {
    try {
      const search = parsePropertySearch(req.query as Record<string, any>);
      const results = await storage.getProperties(search);
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

// Single property by zpid — base row plus the extended detail record.
router.get(
  "/api/properties/:zpid",
  requireAuth,
  requireSubscription,
  async (req: Request, res: Response) => {
    try {
      const zpid = req.params.zpid;
      const property = await storage.getProperty(zpid);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const detail = await storage.getPropertyDetail(zpid);
      res.json({ ...property, detail: detail ?? null });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

export default router;
