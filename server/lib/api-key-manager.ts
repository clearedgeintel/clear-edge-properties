import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { ApiKey, InsertApiKey } from "@shared/schema";

// ---------------------------------------------------------------------------
// API key system, re-platformed onto the multi-tenant Supabase `api_keys` table.
// Keys are tenant-scoped with uuid ids. We keep SHA-256 hashing + a stored
// prefix; the plaintext key is shown to the caller exactly once on creation.
//
// The legacy per-request usage logging (api_usage) and usage-based rate limiting
// were retired with the usage-tracking subsystem, so this module no longer
// records usage or computes stats. Rate-limit headers are advisory only.
// ---------------------------------------------------------------------------

export interface CreateApiKeyInput {
  keyName: string;
  permissions?: unknown;
  rateLimit?: number;
  expiresAt?: string | null;
}

export class ApiKeyManager {
  // Generate a new API key with prefix + SHA-256 hash.
  static generateApiKey(): { apiKey: string; keyHash: string; keyPrefix: string } {
    const keyBytes = crypto.randomBytes(32);
    const apiKey = `ce_${keyBytes.toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const keyPrefix = apiKey.substring(0, 10);

    return { apiKey, keyHash, keyPrefix };
  }

  // Hash a plaintext key for lookup.
  static hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  // Create a new API key for a tenant/user.
  static async createApiKey(
    tenantId: string,
    userId: string | null,
    input: CreateApiKeyInput,
  ): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
    const { apiKey: plainTextKey, keyHash, keyPrefix } = this.generateApiKey();

    const values: InsertApiKey = {
      tenantId,
      userId: userId ?? null,
      keyName: input.keyName,
      keyHash,
      keyPrefix,
      permissions: (input.permissions ?? ["read:properties"]) as InsertApiKey["permissions"],
      ...(input.rateLimit !== undefined ? { rateLimit: input.rateLimit } : {}),
      expiresAt: input.expiresAt ?? null,
    };

    const createdKey = await storage.createApiKey(values);
    return { apiKey: createdKey, plainTextKey };
  }

  // List a tenant's API keys (the hash is stored but not the plaintext).
  static async getTenantApiKeys(tenantId: string): Promise<ApiKey[]> {
    return await storage.getApiKeysByTenant(tenantId);
  }

  // Delete an API key within a tenant.
  static async deleteApiKey(tenantId: string, keyId: string): Promise<boolean> {
    const existing = await storage.getApiKeysByTenant(tenantId);
    if (!existing.some((k) => k.id === keyId)) return false;
    await storage.deleteApiKey(tenantId, keyId);
    return true;
  }

  // Verify a plaintext API key. Returns the matching active, unexpired key row
  // (and touches lastUsed) or null.
  static async verifyApiKey(key: string): Promise<ApiKey | null> {
    const keyHash = this.hashKey(key);
    const row = await storage.getApiKeyByHash(keyHash);
    if (!row) return null;
    if (!row.isActive) return null;
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;

    await storage.touchApiKey(row.id);
    return row;
  }
}

// Middleware to authenticate API requests via Bearer API key. On success it
// resolves the owning tenant and attaches a minimal req.ctx { tenantId } so the
// public /api/v1 handlers can scope their queries.
export function authenticateApiKey() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Missing or invalid authorization header. Use: Authorization: Bearer YOUR_API_KEY",
        });
      }

      const apiKey = authHeader.substring(7);
      const keyRow = await ApiKeyManager.verifyApiKey(apiKey);

      if (!keyRow) {
        return res.status(401).json({ error: "Invalid or expired API key" });
      }

      // Attach key info + a minimal request context scoped to the key's tenant.
      (req as any).apiKey = keyRow;
      (req as any).ctx = { tenantId: keyRow.tenantId };

      next();
    } catch (error) {
      console.error("API authentication error:", error);
      return res.status(500).json({ error: "Internal server error during authentication" });
    }
  };
}
