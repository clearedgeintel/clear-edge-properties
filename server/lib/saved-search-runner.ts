import { storage } from "../storage";
import {
  multiPlatformSearch,
  toInsertProperty,
  searchResultZpid,
  type UnifiedProperty,
} from "./multi-platform-search";
import { enrichFirstImports, DEFAULT_ENRICH_SCORE_THRESHOLD } from "./enrichment";
import { sendAlertEmail, buildMatchAlertHtml, alertsConfigured, appBaseUrl } from "./alerts";
import { consoleLogger } from "./console-logger";
import type { SavedSearch, SavedSearchFilters } from "@shared/schema";

// ---------------------------------------------------------------------------
// Saved-search runner. Executes a saved search's criteria as a live search,
// records new matches, applies the first-import enrichment rule to high-scoring
// new properties, and (optionally) emails the owner about new matches.
//
// Matches are tracked in `saved_search_matches`, NOT auto-added to the user's
// tracked deals (`user_properties`) — the user reviews matches and saves what
// they want.
// ---------------------------------------------------------------------------

export interface RunResult {
  savedSearchId: string;
  scanned: number;
  matched: number;
  newMatches: number;
  enriched: number;
  notified: boolean;
}

const FREQ_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export function isDue(s: SavedSearch): boolean {
  const interval = FREQ_MS[(s.alertFrequency || "daily").toLowerCase()] ?? FREQ_MS.daily;
  if (!s.lastRunAt) return true;
  return Date.now() - new Date(s.lastRunAt).getTime() >= interval;
}

// Filters the platform search itself can apply (narrows the API result set).
function toSearchParams(f: SavedSearchFilters) {
  return {
    priceMin: f.min_price ?? undefined,
    priceMax: f.max_price ?? undefined,
    bedsMin: f.min_beds ?? undefined,
    bedsMax: f.max_beds ?? undefined,
    bathsMin: f.min_baths ?? undefined,
    propertyTypes: f.property_types?.length ? f.property_types : undefined,
  };
}

// Remaining filters applied to each result (the API doesn't enforce these).
function passesFilters(p: UnifiedProperty, f: SavedSearchFilters): boolean {
  if (f.min_price != null && p.price != null && p.price < f.min_price) return false;
  if (f.max_price != null && p.price != null && p.price > f.max_price) return false;
  if (f.min_beds != null && p.bedrooms != null && p.bedrooms < f.min_beds) return false;
  if (f.max_beds != null && p.bedrooms != null && p.bedrooms > f.max_beds) return false;
  if (f.min_baths != null && p.bathrooms != null && p.bathrooms < f.min_baths) return false;
  if (f.min_investment_score != null && p.score != null && p.score < f.min_investment_score) return false;
  if (f.max_investment_score != null && p.score != null && p.score > f.max_investment_score) return false;
  if (f.min_cap_rate != null && p.capRate != null && p.capRate < f.min_cap_rate) return false;
  if (f.max_cap_rate != null && p.capRate != null && p.capRate > f.max_cap_rate) return false;
  if (f.property_types?.length && p.propertyType) {
    const want = f.property_types.map((x) => x.toLowerCase());
    const ht = p.propertyType.toLowerCase();
    if (!want.some((w) => w.includes(ht) || ht.includes(w))) return false;
  }
  return true;
}

export async function runSavedSearch(search: SavedSearch): Promise<RunResult> {
  const filters = (search.filters || {}) as SavedSearchFilters;
  const markets = (search.markets ?? []).filter((m) => !!m?.trim());
  const params = toSearchParams(filters);

  // Gather live results across all of the search's markets.
  const all: UnifiedProperty[] = [];
  for (const market of markets) {
    try {
      const results = await multiPlatformSearch.searchAllPlatforms({ location: market, ...params });
      for (const r of results) all.push(...r.properties);
    } catch (err) {
      console.error(`Saved search "${search.searchName}" market "${market}" failed:`, err);
    }
  }

  // De-dupe by namespaced zpid, then apply the remaining filters.
  const byZpid = new Map<string, UnifiedProperty>();
  for (const p of all) {
    const zpid = searchResultZpid(p);
    if (zpid && !byZpid.has(zpid)) byZpid.set(zpid, p);
  }
  const matched = Array.from(byZpid.entries())
    .filter(([, p]) => passesFilters(p, filters))
    .map(([zpid, p]) => ({ zpid, p }));
  const scanned = byZpid.size;

  if (!matched.length) {
    await storage.touchSavedSearchRun(search.id, 0);
    return { savedSearchId: search.id, scanned, matched: 0, newMatches: 0, enriched: 0, notified: false };
  }

  const zpids = matched.map((m) => m.zpid);
  // First-import detection (global) for the enrichment rule.
  const existing = new Set(await storage.getExistingZpids(zpids));

  // Persist matched properties into the shared catalog.
  await storage.upsertProperties(
    matched.map((m) => toInsertProperty(m.p, markets[0])).filter((i) => !!i.zpid),
  );

  // Record matches; returned rows are those new to THIS saved search.
  const newMatchRows = await storage.recordSavedSearchMatches(search.id, zpids);
  await storage.touchSavedSearchRun(search.id, matched.length);

  // "Score > threshold on first import → enrich" for newly-imported matches.
  const enriched = await enrichFirstImports(
    matched
      .filter((m) => !existing.has(m.zpid))
      .map((m) => ({ zpid: m.zpid, platform: m.p.platform, score: m.p.score ?? null })),
    DEFAULT_ENRICH_SCORE_THRESHOLD,
  );

  // Email the owner about new matches, if requested and configured.
  let notified = false;
  const wantsEmail = (search.alertChannels ?? []).some((c) => c.toLowerCase().includes("email"));
  if (newMatchRows.length && wantsEmail && alertsConfigured()) {
    const user = await storage.getUser(search.userId);
    if (user?.email) {
      const newByZpid = new Set(newMatchRows.map((r) => r.zpid));
      const items = matched
        .filter((m) => newByZpid.has(m.zpid))
        .map((m) => ({
          zpid: m.zpid,
          address: m.p.address?.streetAddress || null,
          city: m.p.address?.city || null,
          state: m.p.address?.state || null,
          price: m.p.price != null ? String(m.p.price) : null,
          score: m.p.score != null ? String(m.p.score) : null,
        }));
      const sent = await sendAlertEmail({
        to: user.email,
        subject: `${newMatchRows.length} new match${newMatchRows.length === 1 ? "" : "es"}: ${search.searchName}`,
        html: buildMatchAlertHtml(search.searchName, items, { baseUrl: appBaseUrl(), savedSearchId: search.id }),
      });
      if (sent) {
        await storage.markMatchesNotified(newMatchRows.map((r) => r.id));
        notified = true;
      }
    }
  }

  consoleLogger.logInfo(
    `Saved search "${search.searchName}": ${matched.length} matched, ${newMatchRows.length} new, ${enriched} enriched`,
  );
  return { savedSearchId: search.id, scanned, matched: matched.length, newMatches: newMatchRows.length, enriched, notified };
}

// Run every active saved search whose alertFrequency interval has elapsed.
export async function runDueSavedSearches(): Promise<{ ran: number; results: RunResult[] }> {
  const due = (await storage.listActiveSavedSearches()).filter(isDue);
  const results: RunResult[] = [];
  for (const s of due) {
    try {
      results.push(await runSavedSearch(s));
    } catch (err) {
      console.error(`Saved search ${s.id} run failed:`, err);
    }
  }
  return { ran: results.length, results };
}
