import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import type { Property } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DealControl } from "@/components/deal-control";
import { PropertyDrawer } from "@/components/property-drawer";
import { ScoreBadge } from "@/components/score-badge";
import { PropertyImageFallback } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { asUtc, useDealActions, useDeals } from "@/lib/deals";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  zpid: string;
  matchDate: string | null;
  wasNotified: boolean | null;
  property: Property | null;
}

const PAGE = 20;
// Matches recorded within this window of the last run count as "new".
const NEW_WINDOW_MS = 10 * 60 * 1000;

function Thumb({ src }: { src: string | null | undefined }) {
  const [error, setError] = useState(false);
  return (
    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
      {src && !error ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setError(true)} />
      ) : (
        <PropertyImageFallback compact />
      )}
    </div>
  );
}

/** A saved search's matches, each one click from the pipeline. */
export function SavedSearchMatches({
  savedSearchId,
  lastRunAt,
  highlightZpid,
}: {
  savedSearchId: string;
  lastRunAt: string | null;
  highlightZpid?: string | null;
}) {
  const { data, isLoading, isError } = useQuery<{ matches: Match[] }>({
    queryKey: [`/api/saved-searches/${savedSearchId}/matches`],
    staleTime: 0,
  });
  const { byZpid, stages } = useDeals();
  const { addDeal } = useDealActions();
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [drawer, setDrawer] = useState<Property | null>(null);

  const matches = (data?.matches ?? []).filter((m) => m.property);
  const untracked = matches.filter((m) => !byZpid.has(m.zpid));
  const lastRun = asUtc(lastRunAt);
  const isNew = (m: Match) => {
    const at = asUtc(m.matchDate);
    return !!(at && lastRun && new Date(at).getTime() >= new Date(lastRun).getTime() - NEW_WINDOW_MS);
  };

  // Deep link from an alert email: show and highlight that match.
  const highlightIndex = highlightZpid ? matches.findIndex((m) => m.zpid === highlightZpid) : -1;
  useEffect(() => {
    if (highlightIndex >= PAGE) setShowAll(true);
    if (highlightIndex >= 0) {
      requestAnimationFrame(() =>
        document.querySelector(`[data-match-zpid="${CSS.escape(highlightZpid!)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    }
  }, [highlightIndex, highlightZpid]);

  const addAll = async () => {
    setBulkBusy(true);
    const outcomes = await Promise.allSettled(
      untracked.map((m) => addDeal.mutateAsync({ source: { zpid: m.zpid }, savedSearchId, origin: "saved search" })),
    );
    setBulkBusy(false);
    const ok = outcomes.filter((o) => o.status === "fulfilled").length;
    toast({
      title: `${ok} ${ok === 1 ? "match" : "matches"} added to ${stages[0]?.name ?? "your pipeline"}`,
      description: ok < outcomes.length ? `${outcomes.length - ok} couldn't be added.` : undefined,
    });
  };

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading matches…
      </p>
    );
  }
  if (isError) return <p className="px-4 py-6 text-sm text-muted-foreground">Couldn't load matches.</p>;
  if (!matches.length) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">No matches yet. Run the search to check for new properties.</p>;
  }

  const visible = showAll ? matches : matches.slice(0, PAGE);

  return (
    <div className="border-t border-border bg-slate-50/60">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{matches.length}</span> matches ·{" "}
          <span className="tabular-nums">{untracked.length}</span> not in your pipeline
        </p>
        {untracked.length > 0 && (
          <Button size="sm" variant="cta" onClick={addAll} disabled={bulkBusy}>
            {bulkBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            Add {untracked.length} to pipeline
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border border-t border-border bg-white">
        {visible.map((m) => {
          const p = m.property!;
          const when = asUtc(m.matchDate);
          return (
            <li
              key={m.id}
              data-match-zpid={m.zpid}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                m.zpid === highlightZpid && "bg-brand-light/60 ring-2 ring-inset ring-brand-orange",
              )}
            >
              <button type="button" onClick={() => setDrawer(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Thumb src={p.imgMain} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-brand-navy">
                      {p.price ? `$${Number(p.price).toLocaleString()}` : "Contact for price"}
                    </span>
                    {isNew(m) && <Badge className="border-0 bg-brand-orange px-1.5 py-0 text-[10px] text-white hover:bg-brand-orange">New</Badge>}
                  </span>
                  <span className="block truncate text-xs text-slate-600">
                    {[p.addressStreet || p.address, p.addressCity, p.addressState].filter(Boolean).join(", ")}
                  </span>
                  {when && (
                    <span className="block text-[11px] text-slate-400">
                      matched {formatDistanceToNow(new Date(when), { addSuffix: true })}
                    </span>
                  )}
                </span>
              </button>
              {p.investmentScorePercent != null && (
                <ScoreBadge investmentScorePercent={p.investmentScorePercent} size="sm" className="hidden sm:inline-flex" />
              )}
              <DealControl
                zpid={m.zpid}
                source={{ zpid: m.zpid }}
                origin="saved search"
                savedSearchId={savedSearchId}
                listingUrl={p.url}
                className="shrink-0"
              />
            </li>
          );
        })}
      </ul>
      {matches.length > PAGE && !showAll && (
        <div className="border-t border-border bg-white px-4 py-2 text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
            Show all {matches.length} matches
          </Button>
        </div>
      )}
      <PropertyDrawer property={drawer} open={drawer !== null} onOpenChange={(o) => !o && setDrawer(null)} />
    </div>
  );
}
