import type { Tenant } from "@shared/schema";

// ---------------------------------------------------------------------------
// Tier limits — re-platformed onto the multi-tenant Supabase model.
// Subscription tier and quotas now live on the TENANT (req.ctx.tenant), not the
// user. The legacy usage_events / usage_summaries tables were retired, so we no
// longer count per-period usage in the database; middleware gates purely on the
// tenant's configured limits (subscriptionTier + max_* columns). Real usage
// metering can be reintroduced later if those tables come back.
// ---------------------------------------------------------------------------

export interface TierConfig {
  searchesPerMonth: number;
  aiGenerationsPerMonth: number;
  watchlistItems: number;
  pdfExportsPerMonth: number;
  apiRequestsPerHour: number;
}

export const TIER_LIMITS: Record<string, TierConfig> = {
  free: {
    searchesPerMonth: 10,
    aiGenerationsPerMonth: 3,
    watchlistItems: 5,
    pdfExportsPerMonth: 2,
    apiRequestsPerHour: 50,
  },
  basic: {
    searchesPerMonth: 25,
    aiGenerationsPerMonth: 15,
    watchlistItems: 25,
    pdfExportsPerMonth: 10,
    apiRequestsPerHour: 200,
  },
  pro: {
    searchesPerMonth: 100,
    aiGenerationsPerMonth: 50,
    watchlistItems: 100,
    pdfExportsPerMonth: 50,
    apiRequestsPerHour: 500,
  },
  enterprise: {
    searchesPerMonth: Infinity,
    aiGenerationsPerMonth: Infinity,
    watchlistItems: Infinity,
    pdfExportsPerMonth: Infinity,
    apiRequestsPerHour: 2000,
  },
};

export function getTierLimits(tier: string | null | undefined): TierConfig {
  return TIER_LIMITS[tier || "free"] || TIER_LIMITS.free;
}

// Resolve effective limits for a tenant. Start from the tier defaults, then let
// any explicit per-tenant overrides (max_* columns) win when present.
export function getTenantLimits(tenant: Tenant | null | undefined): TierConfig {
  const base = getTierLimits(tenant?.subscriptionTier);
  if (!tenant) return base;
  return {
    ...base,
    searchesPerMonth:
      tenant.maxSearchesPerMonth != null ? tenant.maxSearchesPerMonth : base.searchesPerMonth,
    watchlistItems:
      tenant.maxTrackedProperties != null ? tenant.maxTrackedProperties : base.watchlistItems,
  };
}

type FeatureKey = "search" | "ai_generation" | "pdf_export";

const FEATURE_LIMIT_MAP: Record<FeatureKey, keyof TierConfig> = {
  search: "searchesPerMonth",
  ai_generation: "aiGenerationsPerMonth",
  pdf_export: "pdfExportsPerMonth",
};

const isDevelopment = process.env.NODE_ENV === "development";

// requireTierLimit keeps the same exported name/shape the search & ai routes
// import, but is now backed by tenant fields on req.ctx.tenant. With the usage
// tables gone, we can only enforce that the tenant's plan permits the feature
// (limit > 0); we no longer have a per-period counter to compare against, so a
// non-zero limit allows the request through.
export function requireTierLimit(feature: FeatureKey) {
  return async (req: any, res: any, next: any) => {
    if (isDevelopment) {
      return next();
    }

    const tenant: Tenant | undefined = req.ctx?.tenant;
    if (!tenant) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Owners/admins are not throttled.
    const role = req.ctx?.user?.role;
    if (role === "owner" || role === "admin") {
      return next();
    }

    const limits = getTenantLimits(tenant);
    const limit = limits[FEATURE_LIMIT_MAP[feature]];

    // A limit of 0 (or negative) means the plan does not include this feature.
    if (limit <= 0) {
      return res.status(429).json({
        error: "Feature not available on your plan",
        feature,
        limit,
        tier: tenant.subscriptionTier,
        upgradeUrl: "/pricing",
      });
    }

    next();
  };
}
