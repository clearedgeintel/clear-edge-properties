import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { normalizeRedfinDetail } from './enrichment';
import type { SearchItem } from './adapters';

// Results scoring above this auto-load their full detail (agent, zestimate,
// taxes, schools, risk) when their card scrolls into view. Mirrors the
// server-side first-import enrichment rule.
export const AUTO_ENRICH_SCORE_THRESHOLD = 50;

/**
 * Zillow enriches by zpid, Redfin by listing url, Crexi by id (+slug). LoopNet
 * has no detail fetcher. Returns the request to make, or null when unsupported.
 */
function detailRequest(item: SearchItem): { url: string; normalize?: (d: any) => any } | null {
  const p = item.raw;
  switch (item.platform) {
    case 'zillow':
      return p.id ? { url: `/api/zillow/property/${encodeURIComponent(p.id)}` } : null;
    case 'redfin': {
      const url = p.listingUrl || p.url;
      return url
        ? { url: `/api/redfin/property?url=${encodeURIComponent(url)}`, normalize: normalizeRedfinDetail }
        : null;
    }
    case 'crexi': {
      if (!p.id) return null;
      const slug = p.listingSlug ? `?slug=${encodeURIComponent(p.listingSlug)}` : '';
      return { url: `/api/crexi/listing/${encodeURIComponent(p.id)}${slug}` };
    }
    default:
      return null;
  }
}

export const canEnrich = (item: SearchItem) => detailRequest(item) !== null;

export const shouldAutoEnrich = (item: SearchItem) =>
  canEnrich(item) && (item.view.score ?? 0) > AUTO_ENRICH_SCORE_THRESHOLD;

/**
 * Shared detail fetch: the card (auto-enrich on scroll-in) and the detail sheet
 * (on open / manual load) read the same cache entry, so a listing is fetched
 * at most once per session.
 */
export function useSearchDetail(item: SearchItem | null, enabled: boolean) {
  const req = item ? detailRequest(item) : null;
  return useQuery<any>({
    queryKey: ['search-detail', item?.platform, item?.key],
    enabled: enabled && req !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const res = await apiRequest('GET', req!.url);
      const data = await res.json();
      return req!.normalize ? req!.normalize(data) : data;
    },
  });
}
