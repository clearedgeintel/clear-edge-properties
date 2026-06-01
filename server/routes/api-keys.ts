import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "./middleware";
import { ApiKeyManager } from "../lib/api-key-manager";

const router = Router();

// Validation for creating an API key. The hash/prefix are generated server-side;
// the caller only supplies a name and (optionally) permissions/limits/expiry.
const createApiKeySchema = z.object({
  keyName: z.string().min(1),
  permissions: z.array(z.string()).optional(),
  rateLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

// List the current tenant's API keys (hash is stored but never returned plaintext).
router.get("/api/api-keys", requireAuth, async (req: any, res) => {
  try {
    const tenantId = req.ctx.tenantId;
    const apiKeys = await ApiKeyManager.getTenantApiKeys(tenantId);
    res.json(apiKeys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new API key for the current tenant/user. Returns the plaintext key
// exactly once as `apiKey`.
router.post("/api/api-keys", requireAuth, async (req: any, res) => {
  try {
    const tenantId = req.ctx.tenantId;
    const userId = req.ctx.userId;
    const input = createApiKeySchema.parse({
      ...req.body,
      permissions: req.body?.permissions || ["read:properties"],
    });

    const { apiKey, plainTextKey } = await ApiKeyManager.createApiKey(tenantId, userId, input);
    res.json({ ...apiKey, apiKey: plainTextKey });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an API key (uuid id), scoped to the current tenant.
router.delete("/api/api-keys/:id", requireAuth, async (req: any, res) => {
  try {
    const tenantId = req.ctx.tenantId;
    const keyId = req.params.id;
    const success = await ApiKeyManager.deleteApiKey(tenantId, keyId);

    if (!success) {
      return res.status(404).json({ error: "API key not found" });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API usage stats depended on the retired usage-tracking subsystem (api_usage).
// No longer available.
router.get("/api/api-usage/stats", requireAuth, async (_req, res) => {
  res.status(501).json({ error: "API usage statistics are no longer available" });
});

export default router;
