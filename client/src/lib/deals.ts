import { useQuery } from "@tanstack/react-query";

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
    updatedAt: item.updatedAt ?? null,
  };
}

// "Closed" stage (won). "Lost/Archived" does not match.
export const isClosedStage = (name: string | undefined | null) => !!name && /closed/i.test(name);

// Fetches deals + stages from the backend and returns normalized board data.
export function useDeals() {
  const dealsQuery = useQuery<any[]>({ queryKey: ["/api/deals"] });
  const stagesQuery = useQuery<PipelineStage[]>({ queryKey: ["/api/pipeline-stages"] });

  const deals = (dealsQuery.data ?? []).map(mapDeal);
  const stages = [...(stagesQuery.data ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

  return {
    deals,
    stages,
    staged: deals.filter((d) => d.stageId),
    unstaged: deals.filter((d) => !d.stageId),
    isLoading: dealsQuery.isLoading || stagesQuery.isLoading,
  };
}
