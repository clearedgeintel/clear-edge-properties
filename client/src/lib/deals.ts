import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Property } from "@shared/schema";
import { platformFromZpid } from "@shared/search-ids";
import { apiRequest } from "@/lib/queryClient";

// ---------------------------------------------------------------------------
// Deals are backend-persisted: a "deal" is a tracked property (user_properties)
// whose board column is its pipeline stage (pipeline_stages). This replaces the
// former localStorage model. The board, dashboard, and portfolio all read from
// here so they stay consistent.
// ---------------------------------------------------------------------------

export interface PipelineStage {
  id: string;
  name: string;
  orderIndex: number;
  color: string | null;
  icon: string | null;
  isDefault?: boolean | null;
}

// Normalized board card. `stageId` null means the property is tracked/saved but
// not yet placed in the pipeline (it's pickable in "Add Deal").
export interface PipelineDeal {
  id: string; // user_properties uuid (the PATCH /api/deals/:id target)
  zpid: string;
  stageId: string | null;
  notes: string;
  isFavorite: boolean;
  title: string;
  address: string;
  price: number;
  score: number;
  updatedAt: string | null;
  image: string | null;
  url: string | null;
  city: string;
  /** Source platform, from the zpid namespace (zillow | redfin | loopnet | crexi). */
  platform: string;
  /** The joined catalog row (for opening the property drawer). */
  property: Property | null;
}

// Timestamps come back as "YYYY-MM-DD HH:MM:SS" with no zone, but they're UTC
// (now() on a timestamp column). Without a zone the browser parses them as
// local time, so "updated just now" rendered as "in about 5 hours".
export function asUtc(ts: string | null | undefined): string | null {
  if (!ts) return null;
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts.replace(" ", "T")}Z`;
}

function mapDeal(item: any): PipelineDeal {
  const p = item.property || {};
  const address =
    p.fullAddress ||
    [p.addressStreet, p.addressCity, p.addressState, p.addressZip].filter(Boolean).join(", ");
  return {
    id: item.id,
    zpid: item.zpid,
    stageId: item.pipelineStageId ?? null,
    notes: item.customNotes ?? "",
    isFavorite: !!item.isFavorite,
    title: p.fullAddress || p.addressStreet || `Property ${item.zpid}`,
    address: address || "(address unavailable)",
    price: Math.round(Number(p.listPrice ?? p.price ?? 0)) || 0,
    score: Math.round(Number(p.investmentScorePercent ?? 0)) || 0,
    updatedAt: asUtc(item.updatedAt),
    image: p.imgMain ?? null,
    url: p.url ?? null,
    city: [p.addressCity, p.addressState].filter(Boolean).join(", "),
    platform: platformFromZpid(item.zpid ?? ""),
    property: item.property ?? null,
  };
}

// "Closed" stage (won). "Lost/Archived" does not match.
export const isClosedStage = (name: string | undefined | null) => !!name && /closed/i.test(name);

// Fetches deals + stages from the backend and returns normalized board data.
export function useDeals() {
  const dealsQuery = useQuery<any[]>({ queryKey: ["/api/deals"] });
  const stagesQuery = useQuery<PipelineStage[]>({ queryKey: ["/api/pipeline-stages"] });

  const deals = useMemo(() => (dealsQuery.data ?? []).map(mapDeal), [dealsQuery.data]);
  const stages = useMemo(
    () => [...(stagesQuery.data ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [stagesQuery.data],
  );
  const byZpid = useMemo(() => new Map(deals.map((d) => [d.zpid, d])), [deals]);

  return {
    deals,
    stages,
    byZpid,
    staged: deals.filter((d) => d.stageId),
    unstaged: deals.filter((d) => !d.stageId),
    isLoading: dealsQuery.isLoading || stagesQuery.isLoading,
    isError: dealsQuery.isError || stagesQuery.isError,
    refetch: () => {
      dealsQuery.refetch();
      stagesQuery.refetch();
    },
  };
}

// ---------------------------------------------------------------------------
// Deal actions shared by every "add to pipeline" surface (search, browse, map,
// drawers, board). POST /api/deals accepts a catalog zpid or a live search
// result, so a property goes from search to the board in one call.
// ---------------------------------------------------------------------------

/** What POST /api/deals needs for a live search result (UnifiedProperty-like). */
export interface DealSearchResult {
  id: string | number;
  platform: string;
  [key: string]: unknown;
}

export type DealSource = { zpid: string } | { result: DealSearchResult; searchMarket?: string };

/** stageId: undefined → first stage, null → save only, string → that stage. */
export interface AddDealInput {
  source: DealSource;
  stageId?: string | null;
  /** Recorded in the deal's activity history (e.g. "browse", "map"). */
  origin?: string;
  savedSearchId?: string;
}

/** Matches /api/deals, /api/deals/:id/activities, etc. */
const isDealsQuery = (q: { queryKey: readonly unknown[] }) => String(q.queryKey[0]).startsWith("/api/deals");

export { isDealsQuery };

export function useDealActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ predicate: isDealsQuery });
    qc.invalidateQueries({ queryKey: ["/api/watchlist"] });
  };

  const addDeal = useMutation({
    mutationFn: async ({ source, stageId, origin, savedSearchId }: AddDealInput) => {
      const body: Record<string, unknown> = { ...source, origin, savedSearchId };
      if (stageId !== undefined) body.pipelineStageId = stageId;
      return (await apiRequest("POST", "/api/deals", body)).json();
    },
    onSettled: invalidate,
  });

  const setStage = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string | null }) =>
      (await apiRequest("PATCH", `/api/deals/${id}`, { pipelineStageId: stageId })).json(),
    onMutate: async ({ id, stageId }) => {
      await qc.cancelQueries({ queryKey: ["/api/deals"] });
      const prev = qc.getQueryData<any[]>(["/api/deals"]);
      qc.setQueryData<any[]>(["/api/deals"], (old = []) =>
        old.map((it) => (it.id === id ? { ...it, pipelineStageId: stageId } : it)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["/api/deals"], ctx.prev);
    },
    onSettled: invalidate,
  });

  // Stop tracking entirely (deletes the user_properties row and its deal data).
  const removeDeal = useMutation({
    mutationFn: async (zpid: string) => (await apiRequest("DELETE", `/api/watchlist/${encodeURIComponent(zpid)}`)).json(),
    onSettled: invalidate,
  });

  return { addDeal, setStage, removeDeal };
}
