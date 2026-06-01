import { Router, type Response } from "express";
import { requireAuth } from "./middleware";
import type { AuthedRequest } from "../types";

const router = Router();

// Auth routes. Supabase is the identity provider; requireAuth verifies the
// bearer token and attaches req.ctx = { user, tenant, userId, tenantId }.
// These endpoints simply surface the authenticated session.

// Current authenticated user + their tenant.
router.get("/api/auth/user", requireAuth, (req, res: Response) => {
  const { ctx } = req as AuthedRequest;
  res.json({ user: ctx.user, tenant: ctx.tenant });
});

// Alias: session/me endpoint.
router.get("/api/auth/me", requireAuth, (req, res: Response) => {
  const { ctx } = req as AuthedRequest;
  res.json({ user: ctx.user, tenant: ctx.tenant });
});

export default router;
