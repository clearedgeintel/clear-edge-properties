import { storage } from "../storage";
import { zillowApi, type ZillowPropertyDetail } from "./zillow";
import { consoleLogger } from "./console-logger";
import type { InsertPropertyDetail } from "@shared/schema";

// ---------------------------------------------------------------------------
// Detail enrichment. When a high-scoring property is imported for the first
// time, fetch its full listing detail and persist it into `property_details`.
//
// Only Zillow (us-housing-market-data1) currently has a detail fetcher; other
// platforms are no-ops until their detail mappers are built. The rule itself
// is platform-agnostic so the saved-search runner and the manual save path can
// share it.
// ---------------------------------------------------------------------------

export const DEFAULT_ENRICH_SCORE_THRESHOLD = 50;

// A minimal description of a freshly-imported property the enrichment rule
// needs: its key, the platform it came from, and its investment score.
export interface EnrichCandidate {
  zpid: string;
  platform: string;
  score: number | null;
}

const num = (v: number | null | undefined) => (v == null ? null : String(v));
const int = (v: number | null | undefined) => (v == null ? null : Math.round(v));

// Pick a climate risk by type from the detail's climateRisks array.
function risk(detail: ZillowPropertyDetail, type: string): { label: string | null; score: number | null } {
  const r = (detail.climateRisks || []).find((x) => x.type?.toLowerCase() === type);
  return { label: r?.label ?? null, score: int(r?.value ?? null) };
}

// Find the first school whose level matches one of the given keywords.
function schoolFor(detail: ZillowPropertyDetail, levels: string[]): string | null {
  const s = (detail.schools || []).find((x) =>
    levels.some((l) => (x.level || "").toLowerCase().includes(l)),
  );
  return s?.name ?? null;
}

export function mapZillowDetailToInsert(detail: ZillowPropertyDetail): InsertPropertyDetail {
  const flood = risk(detail, "flood");
  const fire = risk(detail, "fire");
  const wind = risk(detail, "wind");
  const heat = risk(detail, "heat");
  const air = risk(detail, "air");

  const schoolsSummary =
    (detail.schools || [])
      .map((s) => (s.rating != null ? `${s.name} (${s.rating}/10)` : s.name))
      .join("; ") || null;

  return {
    zpid: detail.zpid,
    mlsId: detail.mlsId,
    mlsName: detail.mlsName,
    listingAgentName: detail.agent?.name ?? null,
    listingAgentPhone: detail.agent?.phone ?? null,
    listingAgentEmail: detail.agent?.email ?? null,
    brokerageName: detail.agent?.company ?? null,
    premierAgentName: detail.agent?.rating != null ? detail.agent?.name ?? null : null,
    propertyTaxRate: num(detail.propertyTaxRate),
    annualPropertyTax: num(detail.annualTax),
    floodRiskLabel: flood.label,
    floodRiskScore: flood.score,
    fireRiskLabel: fire.label,
    fireRiskScore: fire.score,
    windRiskLabel: wind.label,
    windRiskScore: wind.score,
    heatRiskLabel: heat.label,
    heatRiskScore: heat.score,
    airRiskLabel: air.label,
    airRiskScore: air.score,
    primarySchoolDistrict: schoolFor(detail, ["primary", "elementary"]),
    middleSchoolDistrict: schoolFor(detail, ["middle"]),
    highSchoolDistrict: schoolFor(detail, ["high"]),
    schoolsSummary,
    description: detail.description,
  };
}

// Fetch + persist details for one property. Returns true if details were saved.
// Currently only Zillow listings can be enriched.
export async function enrichProperty(zpid: string, platform: string): Promise<boolean> {
  if (platform !== "zillow") return false;
  try {
    const detail = await zillowApi.getPropertyEnrichment(zpid);
    if (!detail) {
      consoleLogger.logInfo(`Enrichment: no Zillow detail for ${zpid}`);
      return false;
    }
    await storage.upsertPropertyDetail(mapZillowDetailToInsert(detail));
    consoleLogger.logInfo(`Enriched property ${zpid} (agent=${detail.agent?.name ?? "n/a"})`);
    return true;
  } catch (err) {
    console.error(`Enrichment failed for ${zpid}:`, err);
    return false;
  }
}

// Apply the "score > threshold on first import" rule to a batch of
// freshly-imported properties. Enriches sequentially (the RapidAPI plan is
// rate-limited) and never throws — enrichment is best-effort. Returns the
// count actually enriched.
export async function enrichFirstImports(
  candidates: EnrichCandidate[],
  threshold: number = DEFAULT_ENRICH_SCORE_THRESHOLD,
): Promise<number> {
  const eligible = candidates.filter(
    (c) => c.zpid && c.platform === "zillow" && (c.score ?? 0) > threshold,
  );
  if (!eligible.length) return 0;
  consoleLogger.logInfo(
    `Enrichment: ${eligible.length} first-import propert${eligible.length === 1 ? "y" : "ies"} over score ${threshold}`,
  );
  let enriched = 0;
  for (const c of eligible) {
    if (await enrichProperty(c.zpid, c.platform)) enriched++;
  }
  return enriched;
}
