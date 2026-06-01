import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "./middleware";
import type { Buyer, InsertBuyer } from "@shared/schema";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Cash-buyer list + buy-box matching. The dispo asset: keep a tenant's
// investor-buyers with their buy box, then match found/saved deals to ready
// buyers. Buyer data is sourced externally (county records, PropStream, etc.).
// ---------------------------------------------------------------------------

// Accepts numbers from the client; numeric DB columns are stored as strings.
const buyerInput = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  buyerType: z.string().optional(),
  targetZips: z.array(z.string()).optional(),
  targetCities: z.array(z.string()).optional(),
  targetStates: z.array(z.string()).optional(),
  propertyTypes: z.array(z.string()).optional(),
  minBeds: z.number().int().optional(),
  maxBeds: z.number().int().optional(),
  minBaths: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  arvMin: z.number().optional(),
  arvMax: z.number().optional(),
  conditionTolerance: z.string().optional(),
  proofOfFunds: z.boolean().optional(),
  proofOfFundsAmount: z.number().optional(),
  proofOfFundsVerifiedAt: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});
type BuyerInput = z.infer<typeof buyerInput>;

const numStr = (v: number | undefined) => (v == null ? undefined : String(v));

function toInsert(input: BuyerInput, tenantId: string, userId: string | null): InsertBuyer {
  return {
    tenantId,
    userId: userId ?? undefined,
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    buyerType: input.buyerType,
    targetZips: input.targetZips,
    targetCities: input.targetCities,
    targetStates: input.targetStates,
    propertyTypes: input.propertyTypes,
    minBeds: input.minBeds,
    maxBeds: input.maxBeds,
    minBaths: numStr(input.minBaths),
    minPrice: numStr(input.minPrice),
    maxPrice: numStr(input.maxPrice),
    arvMin: numStr(input.arvMin),
    arvMax: numStr(input.arvMax),
    conditionTolerance: input.conditionTolerance,
    proofOfFunds: input.proofOfFunds,
    proofOfFundsAmount: numStr(input.proofOfFundsAmount),
    proofOfFundsVerifiedAt: input.proofOfFundsVerifiedAt,
    source: input.source,
    tags: input.tags,
    notes: input.notes,
    isActive: input.isActive,
  };
}

// ---- Buy-box matching ------------------------------------------------------

export interface MatchTarget {
  zip?: string | null;
  city?: string | null;
  state?: string | null;
  beds?: number | null;
  baths?: number | null;
  price?: number | null;
  homeType?: string | null;
}

const toNum = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

// A buyer matches when every constraint their buy box specifies is satisfied.
// Unspecified buy-box fields impose no constraint; unknown property fields can't
// disqualify. Geo uses the most specific list the buyer set (zip > city > state).
export function buyerMatches(buyer: Buyer, t: MatchTarget): boolean {
  // Geo
  const zips = buyer.targetZips ?? [];
  const cities = (buyer.targetCities ?? []).map((c) => c.toLowerCase());
  const states = (buyer.targetStates ?? []).map((s) => s.toUpperCase());
  if (zips.length > 0) {
    if (!t.zip || !zips.includes(t.zip)) return false;
  } else if (cities.length > 0) {
    if (!t.city || !cities.includes(t.city.toLowerCase())) return false;
  } else if (states.length > 0) {
    if (!t.state || !states.includes(t.state.toUpperCase())) return false;
  }

  // Price
  const min = toNum(buyer.minPrice);
  const max = toNum(buyer.maxPrice);
  if (t.price != null) {
    if (min != null && t.price < min) return false;
    if (max != null && t.price > max) return false;
  }

  // Beds / baths
  if (t.beds != null) {
    if (buyer.minBeds != null && t.beds < buyer.minBeds) return false;
    if (buyer.maxBeds != null && t.beds > buyer.maxBeds) return false;
  }
  const minBaths = toNum(buyer.minBaths);
  if (t.baths != null && minBaths != null && t.baths < minBaths) return false;

  // Property type (loose, case-insensitive substring either direction)
  const types = (buyer.propertyTypes ?? []).map((x) => x.toLowerCase());
  if (types.length > 0 && t.homeType) {
    const ht = t.homeType.toLowerCase().replace(/_/g, " ");
    const ok = types.some((x) => {
      const xt = x.replace(/_/g, " ");
      return xt.includes(ht) || ht.includes(xt);
    });
    if (!ok) return false;
  }

  return true;
}

// ---- Routes ----------------------------------------------------------------

router.get("/api/buyers", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    const list = await storage.listBuyers(tenantId);
    res.json({ buyers: list });
  } catch (error: any) {
    console.error("List buyers error:", error);
    res.status(500).json({ error: error.message || "Failed to list buyers" });
  }
});

router.post("/api/buyers", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = (req as any).ctx;
    const input = buyerInput.parse(req.body);
    const buyer = await storage.createBuyer(toInsert(input, tenantId, userId));
    res.status(201).json(buyer);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: error.errors?.[0]?.message || "Invalid buyer" });
    }
    console.error("Create buyer error:", error);
    res.status(500).json({ error: error.message || "Failed to create buyer" });
  }
});

// Bulk import (e.g. a PropStream/county CSV parsed client-side into rows).
router.post("/api/buyers/import", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = (req as any).ctx;
    const { buyers: rows } = z
      .object({ buyers: z.array(buyerInput).min(1).max(2000) })
      .parse(req.body);
    const inserted = await storage.createBuyersBulk(
      rows.map((r) => toInsert(r, tenantId, userId)),
    );
    res.json({ imported: inserted.length });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: error.errors?.[0]?.message || "Invalid import" });
    }
    console.error("Import buyers error:", error);
    res.status(500).json({ error: error.message || "Failed to import buyers" });
  }
});

// Match active buyers against a property's attributes (works for live search
// results — no saved property required).
router.post("/api/buyers/match", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    const target = z
      .object({
        zip: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        beds: z.number().nullish(),
        baths: z.number().nullish(),
        price: z.number().nullish(),
        homeType: z.string().nullish(),
      })
      .parse(req.body);

    const all = await storage.listBuyers(tenantId);
    const matched = all
      .filter((b) => b.isActive !== false && buyerMatches(b, target))
      .map((b) => ({
        id: b.id,
        name: b.name,
        company: b.company,
        phone: b.phone,
        email: b.email,
        buyerType: b.buyerType,
        proofOfFunds: b.proofOfFunds,
      }));
    res.json({ count: matched.length, buyers: matched });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: "Invalid match target" });
    }
    console.error("Match buyers error:", error);
    res.status(500).json({ error: error.message || "Failed to match buyers" });
  }
});

router.get("/api/buyers/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    const buyer = await storage.getBuyer(tenantId, req.params.id);
    if (!buyer) return res.status(404).json({ error: "Buyer not found" });
    res.json(buyer);
  } catch (error: any) {
    console.error("Get buyer error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch buyer" });
  }
});

router.patch("/api/buyers/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    const input = buyerInput.partial().parse(req.body);
    // Reuse toInsert for numeric coercion, then drop tenant/user (immutable).
    const mapped = toInsert({ name: input.name ?? "", ...input } as BuyerInput, tenantId, null);
    const { tenantId: _t, userId: _u, ...rest } = mapped;
    const patch: Partial<InsertBuyer> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) (patch as any)[k] = v;
    }
    if (input.name === undefined) delete (patch as any).name;
    const buyer = await storage.updateBuyer(tenantId, req.params.id, patch);
    if (!buyer) return res.status(404).json({ error: "Buyer not found" });
    res.json(buyer);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: error.errors?.[0]?.message || "Invalid buyer" });
    }
    console.error("Update buyer error:", error);
    res.status(500).json({ error: error.message || "Failed to update buyer" });
  }
});

router.delete("/api/buyers/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).ctx;
    await storage.deleteBuyer(tenantId, req.params.id);
    res.json({ deleted: true });
  } catch (error: any) {
    console.error("Delete buyer error:", error);
    res.status(500).json({ error: error.message || "Failed to delete buyer" });
  }
});

export default router;
