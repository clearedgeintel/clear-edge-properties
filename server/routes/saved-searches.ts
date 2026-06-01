import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "./middleware";
import { runSavedSearch, runDueSavedSearches } from "../lib/saved-search-runner";
import type { InsertSavedSearch } from "@shared/schema";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Saved searches: persisted search criteria that run on a schedule (or on
// demand), record new matches, enrich high-scoring first imports, and alert
// the owner. CRUD is tenant+user scoped; the cron endpoint is service-secured.
// ---------------------------------------------------------------------------

const filtersSchema = z
  .object({
    min_price: z.number().nullable().optional(),
    max_price: z.number().nullable().optional(),
    min_beds: z.number().nullable().optional(),
    max_beds: z.number().nullable().optional(),
    min_baths: z.number().nullable().optional(),
    min_cap_rate: z.number().nullable().optional(),
    max_cap_rate: z.number().nullable().optional(),
    min_cash_flow: z.number().nullable().optional(),
    min_investment_score: z.number().nullable().optional(),
    max_investment_score: z.number().nullable().optional(),
    property_types: z.array(z.string()).optional(),
    home_status: z.array(z.string()).optional(),
    is_below_zestimate: z.boolean().nullable().optional(),
    exclude_negative_cash_flow: z.boolean().nullable().optional(),
  })
  .partial();

const savedSearchInput = z.object({
  searchName: z.string().min(1, "Name is required"),
  markets: z.array(z.string()).min(1, "At least one market is required"),
  filters: filtersSchema.optional(),
  alertFrequency: z.enum(["hourly", "daily", "weekly"]).optional(),
  alertChannels: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

router.get("/api/saved-searches", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = (req as any).ctx;
    const list = await storage.listSavedSearches(tenantId, userId);
    res.json({ savedSearches: list });
  } catch (error: any) {
    console.error("List saved searches error:", error);
    res.status(500).json({ error: error.message || "Failed to list saved searches" });
  }
});

router.post("/api/saved-searches", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = (req as any).ctx;
    const input = savedSearchInput.parse(req.body);
    const values: InsertSavedSearch = {
      tenantId,
      userId,
      searchName: input.searchName,
      markets: input.markets,
      filters: input.filters ?? {},
      alertFrequency: input.alertFrequency ?? "daily",
      alertChannels: input.alertChannels ?? ["email"],
      isActive: input.isActive ?? true,
    };
    const created = await storage.createSavedSearch(values);
    res.status(201).json(created);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: error.errors?.[0]?.message || "Invalid saved search" });
    }
    console.error("Create saved search error:", error);
    res.status(500).json({ error: error.message || "Failed to create saved search" });
  }
});

router.patch("/api/saved-searches/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    const input = savedSearchInput.partial().parse(req.body);
    const patch: Partial<InsertSavedSearch> = {};
    if (input.searchName !== undefined) patch.searchName = input.searchName;
    if (input.markets !== undefined) patch.markets = input.markets;
    if (input.filters !== undefined) patch.filters = input.filters;
    if (input.alertFrequency !== undefined) patch.alertFrequency = input.alertFrequency;
    if (input.alertChannels !== undefined) patch.alertChannels = input.alertChannels;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    const updated = await storage.updateSavedSearch(tenantId, req.params.id, patch);
    if (!updated) return res.status(404).json({ error: "Saved search not found" });
    res.json(updated);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: error.errors?.[0]?.message || "Invalid saved search" });
    }
    console.error("Update saved search error:", error);
    res.status(500).json({ error: error.message || "Failed to update saved search" });
  }
});

router.delete("/api/saved-searches/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    await storage.deleteSavedSearch(tenantId, req.params.id);
    res.json({ deleted: true });
  } catch (error: any) {
    console.error("Delete saved search error:", error);
    res.status(500).json({ error: error.message || "Failed to delete saved search" });
  }
});

// Matches recorded for a saved search.
router.get("/api/saved-searches/:id/matches", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    const search = await storage.getSavedSearch(tenantId, req.params.id);
    if (!search) return res.status(404).json({ error: "Saved search not found" });
    const matches = await storage.getSavedSearchMatches(search.id);
    res.json({ matches });
  } catch (error: any) {
    console.error("Get saved search matches error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch matches" });
  }
});

// Run a saved search now (on demand).
router.post("/api/saved-searches/:id/run", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    const search = await storage.getSavedSearch(tenantId, req.params.id);
    if (!search) return res.status(404).json({ error: "Saved search not found" });
    const result = await runSavedSearch(search);
    res.json(result);
  } catch (error: any) {
    console.error("Run saved search error:", error);
    res.status(500).json({ error: error.message || "Failed to run saved search" });
  }
});

// Cron endpoint: run every due saved search across all tenants. Secured by a
// shared secret (Authorization: Bearer <CRON_SECRET>), NOT user auth, so an
// external scheduler (n8n / Railway cron) can call it. Disabled if no secret set.
router.post("/api/saved-searches/run-due", async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "Cron not configured (CRON_SECRET unset)" });
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });
  try {
    const result = await runDueSavedSearches();
    res.json(result);
  } catch (error: any) {
    console.error("Run-due saved searches error:", error);
    res.status(500).json({ error: error.message || "Failed to run due saved searches" });
  }
});

export default router;
