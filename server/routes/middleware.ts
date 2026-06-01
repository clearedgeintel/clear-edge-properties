import multer from "multer";
import { storage } from "../storage";
import { verifySupabaseUser } from "../lib/supabase";
import type { Tenant, User } from "@shared/schema";

const isDevelopment = process.env.NODE_ENV === "development";
const DEFAULT_TENANT_SLUG = "clearedge";

// Single-org provisioning for pre-launch: all users land in one default tenant.
// Real multi-tenant signup can replace this later.
async function getOrCreateDefaultTenant(): Promise<Tenant> {
  const existing = await storage.getTenantBySlug(DEFAULT_TENANT_SLUG);
  if (existing) return existing;
  try {
    return await storage.createTenant({ name: "ClearEdge", slug: DEFAULT_TENANT_SLUG });
  } catch {
    // Lost a race on the unique slug — re-fetch.
    const t = await storage.getTenantBySlug(DEFAULT_TENANT_SLUG);
    if (t) return t;
    throw new Error("Failed to provision default tenant");
  }
}

async function getOrProvisionUser(opts: { supabaseUserId?: string; email: string; fullName?: string }): Promise<User> {
  if (opts.supabaseUserId) {
    const bySupabase = await storage.getUserBySupabaseId(opts.supabaseUserId);
    if (bySupabase) return bySupabase;
  }
  const byEmail = await storage.getUserByEmail(opts.email);
  if (byEmail) return byEmail;
  const tenant = await getOrCreateDefaultTenant();
  return await storage.createUser({
    tenantId: tenant.id,
    supabaseUserId: opts.supabaseUserId,
    email: opts.email,
    fullName: opts.fullName,
    role: "owner", // first/sole org operator
  });
}

async function attachContext(req: any, user: User): Promise<void> {
  const tenant = await storage.getTenant(user.tenantId!);
  if (!tenant) throw new Error(`Tenant ${user.tenantId} not found for user ${user.id}`);
  req.user = user; // backward-compat
  req.ctx = { user, tenant, userId: user.id, tenantId: tenant.id };
}

export const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    // Try real Supabase auth when a token is present and Supabase is configured.
    if (token && process.env.SUPABASE_URL) {
      const authUser = await verifySupabaseUser(token);
      if (authUser?.email) {
        const user = await getOrProvisionUser({
          supabaseUserId: authUser.id,
          email: authUser.email,
          fullName: (authUser.user_metadata as any)?.full_name || (authUser.user_metadata as any)?.username,
        });
        await attachContext(req, user);
        return next();
      }
    }

    // Development convenience: no valid real token -> use the provisioned dev user.
    if (isDevelopment) {
      const devUser = await getOrProvisionUser({ email: "dev@clearedge.local", fullName: "Dev User" });
      await attachContext(req, devUser);
      return next();
    }

    return res.status(401).json({ error: "Invalid or missing token" });
  } catch (err: any) {
    console.error("requireAuth failed:", err.message);
    res.status(500).json({ error: "Authentication failed" });
  }
};

export const requireSubscription = (req: any, res: any, next: any) => {
  const tenant: Tenant | undefined = req.ctx?.tenant;
  if (isDevelopment) return next();
  if (tenant?.subscriptionStatus !== "active") {
    return res.status(403).json({ error: "Active subscription required" });
  }
  next();
};

export const requireAdmin = (req: any, res: any, next: any) => {
  const role = req.ctx?.user?.role;
  if (role !== "owner" && role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
