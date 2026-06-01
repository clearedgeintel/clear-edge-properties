import { Router, type Request, type Response } from "express";
import { requireAuth } from "./middleware";
import { requireTierLimit } from "../lib/tier-limits";
import { agentApi } from "../lib/agent-api";
import { consoleLogger } from "../lib/console-logger";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Agent intelligence — look up a listing agent and see their active + sold
// listings and reviews (Zillow-sourced via the US Housing Market Data product).
// ---------------------------------------------------------------------------

// Find agents by name (+ optional location).
router.get(
  "/api/agents/search",
  requireAuth,
  requireTierLimit("search"),
  async (req: Request, res: Response) => {
    try {
      const { name, location, page } = z
        .object({
          name: z.string().min(1, "Agent name is required"),
          location: z.string().optional(),
          page: z.coerce.number().int().positive().max(20).optional(),
        })
        .parse(req.query);

      const agents = await agentApi.searchAgents(name, location, page);
      res.json({ agents });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ error: error.errors?.[0]?.message || "Invalid request" });
      }
      console.error("Agent search error:", error);
      res.status(500).json({ error: error.message || "Failed to search agents" });
    }
  },
);

// Full profile for a single agent (active + sold listings + reviews).
router.get(
  "/api/agents/:zuid",
  requireAuth,
  requireTierLimit("search"),
  async (req: Request, res: Response) => {
    try {
      const profile = await agentApi.getAgentProfile(req.params.zuid);
      consoleLogger.logInfo(
        `Agent profile ${req.params.zuid}: ${profile.activeListings.length} active, ${profile.soldListings.length} sold, ${profile.reviewCount} reviews`,
      );
      res.json(profile);
    } catch (error: any) {
      console.error("Agent profile error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch agent profile" });
    }
  },
);

export default router;
