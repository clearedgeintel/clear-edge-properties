import { Router } from "express";
import { storage } from "../storage";
import { authenticateApiKey } from "../lib/api-key-manager";
import { propertySearchSchema } from "@shared/schema";

const router = Router();

// ---------------------------------------------------------------------------
// Public API v1 — read-only property access, protected by API-key auth.
//
// The apikeys group's authenticateApiKey() middleware authenticates the bearer
// API key and attaches the owning tenant id to the request (req.apiTenantId,
// falling back to req.ctx?.tenantId). Properties are global (zpid-keyed,
// written by n8n) and read-only, so a valid tenant simply gates access; the
// storage property reads are not themselves tenant-scoped.
// ---------------------------------------------------------------------------

function getTenantId(req: any): string | undefined {
  return req.apiTenantId ?? req.ctx?.tenantId;
}

// GET /api/v1/properties — search the global property catalog.
router.get("/api/v1/properties", authenticateApiKey(), async (req: any, res) => {
  try {
    if (!getTenantId(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query = propertySearchSchema.parse(req.query);
    const properties = await storage.getProperties(query);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    res.json({
      properties,
      total: properties.length,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/properties/:zpid — fetch a single property by zpid.
router.get("/api/v1/properties/:zpid", authenticateApiKey(), async (req: any, res) => {
  try {
    if (!getTenantId(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const zpid = req.params.zpid;
    const property = await storage.getProperty(zpid);

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json(property);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/ai/analyze — AI investment commentary for a property.
router.post("/api/v1/ai/analyze", authenticateApiKey(), async (req: any, res) => {
  try {
    if (!getTenantId(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Accept zpid (preferred) or legacy propertyId, both string zpids now.
    const zpid: string | undefined = req.body?.zpid ?? req.body?.propertyId;
    const { investorProfile } = req.body ?? {};

    if (!zpid) {
      return res.status(400).json({ error: "zpid is required" });
    }

    const property = await storage.getProperty(String(zpid));
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    const { generatePropertyCommentary } = await import("../lib/ai-commentary");
    const analysis = await generatePropertyCommentary(property);

    res.json({
      property: {
        zpid: property.zpid,
        address: property.fullAddress ?? property.address,
        city: property.addressCity,
        state: property.addressState,
        price: property.price,
        investmentScore: property.investmentScorePercent,
      },
      analysis,
      investorProfile: investorProfile || "general",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/market-data — demographic data for a zip code.
router.get("/api/v1/market-data", authenticateApiKey(), async (req: any, res) => {
  try {
    if (!getTenantId(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { zipCode } = req.query;

    if (!zipCode) {
      return res.status(400).json({ error: "zipCode parameter is required" });
    }

    const { getDemographicData } = await import("../lib/demographics");
    const demographics = await getDemographicData(zipCode as string);

    res.json({
      zipCode,
      demographics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
