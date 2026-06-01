import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "./middleware";
import { requireTierLimit } from "../lib/tier-limits";
import { zillowIntegration } from "../lib/zillow";
import {
  multiPlatformSearch,
  toInsertProperty,
  searchResultZpid,
  type SearchResult,
} from "../lib/multi-platform-search";
import { enrichFirstImports, DEFAULT_ENRICH_SCORE_THRESHOLD } from "../lib/enrichment";
import { consoleLogger } from "../lib/console-logger";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Live external search (Zillow / LoopNet / Redfin via RapidAPI). Search
// endpoints return LIVE results and do NOT persist. A dedicated SAVE endpoint
// upserts a batch of results into `properties` and tracks them for the user.
//
// Re-platform notes:
// - Properties are zpid-keyed and written via storage.saveSearchResults, which
//   upserts each property then adds it to the user's tracked list (scoped by
//   req.ctx.tenantId / req.ctx.userId).
// - The legacy search-logger / property-import modules were removed; saving now
//   goes through the storage contract directly.
// ---------------------------------------------------------------------------

// ---- Zillow ----------------------------------------------------------------

// Search Zillow properties (preview without saving)
router.post(
  "/api/zillow/search",
  requireAuth,
  requireTierLimit("search"),
  async (req: Request, res: Response) => {
    consoleLogger.logRequest("POST", "/api/zillow/search", req.body);
    try {
      const searchParams = z
        .object({
          location: z.string().min(1, "Location is required"),
          priceMin: z.number().optional(),
          priceMax: z.number().optional(),
          bedsMin: z.number().optional(),
          bedsMax: z.number().optional(),
          bathsMin: z.number().optional(),
          bathsMax: z.number().optional(),
          sqftMin: z.number().optional(),
          sqftMax: z.number().optional(),
          homeType: z.string().optional(),
          maxResults: z.number().max(100).optional(),
        })
        .parse(req.body);

      const result = await zillowIntegration.searchAndScoreProperties(searchParams);
      res.json(result);
    } catch (error: any) {
      console.error("Error searching Zillow properties:", error);
      res.status(500).json({ error: error.message || "Failed to search properties" });
    }
  },
);

// Get full Zillow property enrichment by ZPID (or listing url). Returns the
// listing agent + the rich detail the search payload omits.
router.get(
  "/api/zillow/property/:zpid",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { zillowApi } = await import("../lib/zillow");
      const url = typeof req.query.url === "string" ? req.query.url : undefined;
      const detail = await zillowApi.getPropertyEnrichment(url || req.params.zpid);
      if (!detail) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(detail);
    } catch (error: any) {
      console.error("Error fetching Zillow property:", error);
      res.status(500).json({ error: error.message || "Failed to fetch property details" });
    }
  },
);

// Get market analysis for a location
router.post(
  "/api/zillow/market-analysis",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { location } = z
        .object({ location: z.string().min(1, "Location is required") })
        .parse(req.body);

      const analysis = await zillowIntegration.getMarketAnalysis(location);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error getting market analysis:", error);
      res.status(500).json({ error: error.message || "Failed to get market analysis" });
    }
  },
);

// ---- LoopNet ---------------------------------------------------------------

router.post(
  "/api/loopnet/search",
  requireAuth,
  requireTierLimit("search"),
  async (req: Request, res: Response) => {
    try {
      const searchParams = z
        .object({
          location: z.string().min(1, "Location is required"),
          propertyTypes: z.array(z.string()).optional(),
          priceMin: z.number().optional(),
          priceMax: z.number().optional(),
          sqftMin: z.number().optional(),
          sqftMax: z.number().optional(),
          maxResults: z.number().max(100).optional(),
        })
        .parse(req.body);

      const result = await multiPlatformSearch.searchProperties({
        ...searchParams,
        platform: "loopnet",
      });
      res.json(result);
    } catch (error: any) {
      console.error("LoopNet search error:", error);
      res.status(200).json({
        platform: "loopnet",
        totalFound: 0,
        imported: 0,
        errors: 1,
        properties: [],
        errorMessages: [
          "LoopNet service is temporarily unavailable. Please try again later or contact support.",
        ],
      });
    }
  },
);

router.get(
  "/api/loopnet/property/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { loopNetApi } = await import("../lib/loopnet-api");
      const property = await loopNetApi.getPropertyDetails(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      console.error("LoopNet property details error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch property details" });
    }
  },
);

// ---- Redfin ----------------------------------------------------------------

router.post(
  "/api/redfin/search",
  requireAuth,
  requireTierLimit("search"),
  async (req: Request, res: Response) => {
    try {
      const searchParams = z
        .object({
          location: z.string().min(1, "Location is required"),
          priceMin: z.number().optional(),
          priceMax: z.number().optional(),
          bedsMin: z.number().optional(),
          bedsMax: z.number().optional(),
          bathsMin: z.number().optional(),
          bathsMax: z.number().optional(),
          sqftMin: z.number().optional(),
          sqftMax: z.number().optional(),
          homeType: z.string().optional(),
          maxResults: z.number().max(100).optional(),
        })
        .parse(req.body);

      const result = await multiPlatformSearch.searchProperties({
        ...searchParams,
        platform: "redfin",
      });
      res.json(result);
    } catch (error: any) {
      console.error("Redfin search error:", error);
      res.status(200).json({
        platform: "redfin",
        totalFound: 0,
        imported: 0,
        errors: 1,
        properties: [],
        errorMessages: [
          "Redfin search has limited coverage for this location. Please try Zillow for comprehensive property search.",
        ],
      });
    }
  },
);

// Redfin detail is keyed by the listing url path (which contains slashes), so
// it's passed as a `?url=` query param. The legacy `/:id` form is kept for
// callers that pass a full url-encoded listing url.
const redfinDetailHandler = async (req: Request, res: Response) => {
  try {
    const target = ((req.query.url as string) || req.params.id || "").trim();
    if (!target) {
      return res.status(400).json({ error: "A listing url is required" });
    }
    const { redfinApi } = await import("../lib/redfin-api");
    const property = await redfinApi.getPropertyDetails(target);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    res.json(property);
  } catch (error: any) {
    console.error("Redfin property details error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch property details" });
  }
};

router.get("/api/redfin/property", requireAuth, redfinDetailHandler);
router.get("/api/redfin/property/:id", requireAuth, redfinDetailHandler);

// ---- Crexi (commercial) ----------------------------------------------------

router.post(
  "/api/crexi/search",
  requireAuth,
  requireTierLimit("search"),
  async (req: Request, res: Response) => {
    try {
      const searchParams = z
        .object({
          location: z.string().min(1, "Location is required"),
          propertyTypes: z.array(z.string()).optional(),
          priceMin: z.number().optional(),
          priceMax: z.number().optional(),
          sqftMin: z.number().optional(),
          sqftMax: z.number().optional(),
          maxResults: z.number().max(100).optional(),
        })
        .parse(req.body);

      const result = await multiPlatformSearch.searchProperties({
        ...searchParams,
        platform: "crexi",
      });
      res.json(result);
    } catch (error: any) {
      console.error("Crexi search error:", error);
      res.status(200).json({
        platform: "crexi",
        totalFound: 0,
        imported: 0,
        errors: 1,
        properties: [],
        errorMessages: [
          "Crexi service is temporarily unavailable. Please try again later or contact support.",
        ],
      });
    }
  },
);

// ---- Multi-platform search -------------------------------------------------

router.post(
  "/api/search/multi-platform",
  requireAuth,
  requireTierLimit("search"),
  async (req: Request, res: Response) => {
    consoleLogger.logRequest("POST", "/api/search/multi-platform", req.body);
    try {
      const searchParams = z
        .object({
          platform: z.enum(["zillow", "loopnet", "redfin", "crexi"]).optional(),
          location: z.string().min(1, "Location is required"),
          propertyType: z.enum(["residential", "commercial", "mixed"]).optional(),
          priceMin: z.number().optional(),
          priceMax: z.number().optional(),
          bedsMin: z.number().optional(),
          bedsMax: z.number().optional(),
          bathsMin: z.number().optional(),
          bathsMax: z.number().optional(),
          sqftMin: z.number().optional(),
          sqftMax: z.number().optional(),
          homeType: z.string().optional(),
          propertyTypes: z.array(z.string()).optional(),
          maxResults: z.number().max(100).optional(),
        })
        .parse(req.body);

      if (searchParams.platform) {
        const result = await multiPlatformSearch.searchProperties({
          ...searchParams,
          platform: searchParams.platform,
        });
        consoleLogger.logResponse(200, { totalResults: result.properties.length }, searchParams.platform);
        res.json(result);
      } else {
        const results = await multiPlatformSearch.searchAllPlatforms(searchParams);
        const totalResults = results.reduce((sum, r) => sum + r.properties.length, 0);
        consoleLogger.logResponse(
          200,
          { platforms: results.length, totalResults },
          "multi-platform",
        );
        res.json(results);
      }
    } catch (error: any) {
      console.error("Multi-platform search error:", error);
      res.status(500).json({ error: error.message || "Multi-platform search failed" });
    }
  },
);

// ---- Save search results ---------------------------------------------------

// Accepts an array of normalized live search results (multiple per search) and
// upserts + tracks them for the authenticated user/tenant.
router.post(
  "/api/search/save",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { results, searchMarket } = z
        .object({
          searchMarket: z.string().optional(),
          // Live results are passed through; we validate the minimal shape we
          // map from and accept the rest of the normalized fields loosely.
          results: z
            .array(
              z
                .object({
                  id: z.union([z.string(), z.number()]),
                })
                .passthrough(),
            )
            .min(1, "At least one result is required"),
        })
        .parse(req.body);

      const inserts = (results as unknown as SearchResult[])
        .map((r) => toInsertProperty(r, searchMarket))
        .filter((p) => !!p.zpid);

      if (inserts.length === 0) {
        return res.status(400).json({ error: "No saveable results (missing ids)" });
      }

      const { tenantId, userId } = (req as any).ctx;
      const saveResult = await storage.saveSearchResults(tenantId, userId, inserts);

      // "Score > threshold on first import → enrich." Build candidates from the
      // newly-imported (not previously seen) results and fetch their details in
      // the background so the save response isn't blocked on external API calls.
      const newSet = new Set(saveResult.newZpids);
      const enrichCandidates = (results as unknown as SearchResult[])
        .map((r) => ({ zpid: searchResultZpid(r), platform: r.platform, score: r.score ?? null }))
        .filter((c) => newSet.has(c.zpid));
      if (enrichCandidates.length) {
        void enrichFirstImports(enrichCandidates, DEFAULT_ENRICH_SCORE_THRESHOLD).catch((e) =>
          console.error("Background enrichment error:", e),
        );
      }

      res.json({
        saved: saveResult.saved,
        zpids: saveResult.zpids,
        newImports: saveResult.newZpids.length,
        skipped: results.length - inserts.length,
      });
    } catch (error: any) {
      console.error("Save search results error:", error);
      res.status(500).json({ error: error.message || "Failed to save search results" });
    }
  },
);

export default router;
