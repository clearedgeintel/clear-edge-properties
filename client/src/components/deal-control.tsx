import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { Bookmark, BookmarkX, Check, ChevronDown, ExternalLink, KanbanSquare, Loader2, Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useDealActions, useDeals, type DealSource } from "@/lib/deals";
import { apiErrorMessage } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DealControlProps {
  /** The catalog zpid this property has (or will have once added). */
  zpid: string;
  source: DealSource;
  variant?: "full" | "compact";
  /** Stretch to the container width (compact size). "full" always stretches. */
  block?: boolean;
  className?: string;
  /** Optional link to the source listing, shown in the menu. */
  listingUrl?: string | null;
  /** Where this add happens, for the deal's activity history. */
  origin?: string;
  savedSearchId?: string;
}

/**
 * One control for getting a property into the deal pipeline, used everywhere a
 * property appears (search cards + sheet, browse cards, map popups, drawers).
 *
 *   not tracked → "Add to pipeline" (first stage) ▾ any stage / save for later
 *   saved       → "Saved" ▾ move to a stage
 *   in pipeline → "In: {stage}" ▾ change stage / open in pipeline / remove
 */
export function DealControl({
  zpid,
  source,
  variant = "compact",
  block = false,
  className,
  listingUrl,
  origin,
  savedSearchId,
}: DealControlProps) {
  const { byZpid, stages } = useDeals();
  const { addDeal, setStage, removeDeal } = useDealActions();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const deal = zpid ? byZpid.get(zpid) : undefined;
  const stage = deal?.stageId ? stages.find((s) => s.id === deal.stageId) : undefined;
  const busy = addDeal.isPending || setStage.isPending || removeDeal.isPending;
  const full = variant === "full";
  const stretch = full || block;

  const openPipeline = (dealId?: string) => navigate(dealId ? `/deals?deal=${dealId}` : "/deals");

  const notify = (title: string, dealId?: string) =>
    toast({
      title,
      action: (
        <ToastAction altText="View pipeline" onClick={() => openPipeline(dealId)}>
          View pipeline
        </ToastAction>
      ),
    });

  const fail = (error: unknown) =>
    toast({
      title: "Couldn't update pipeline",
      description: apiErrorMessage(error),
      variant: "destructive",
    });

  /** stageId: undefined → first stage, null → save only. */
  const place = (stageId?: string | null) => {
    if (deal) {
      const target = stageId === undefined ? stages[0]?.id ?? null : stageId;
      if (target === deal.stageId) return;
      setStage.mutate(
        { id: deal.id, stageId: target },
        {
          onSuccess: () =>
            notify(target ? `Moved to ${stages.find((s) => s.id === target)?.name}` : "Removed from pipeline", deal.id),
          onError: fail,
        },
      );
      return;
    }
    addDeal.mutate(
      { source, stageId, origin, savedSearchId },
      {
        onSuccess: (created: any) => {
          const name = stages.find((s) => s.id === created?.pipelineStageId)?.name;
          notify(name ? `Added to ${name}` : "Saved for later", created?.id);
        },
        onError: fail,
      },
    );
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const menu = (trigger: ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={stop}>
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {deal?.stageId ? "Move to stage" : "Add to stage"}
        </DropdownMenuLabel>
        {stages.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => place(s.id)} disabled={busy}>
            <span className="mr-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color || "#3B82F6" }} />
            <span className="flex-1 truncate">{s.name}</span>
            {deal?.stageId === s.id && <Check className="h-4 w-4 text-brand-blue" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {!deal && (
          <DropdownMenuItem onSelect={() => place(null)} disabled={busy}>
            <Bookmark className="mr-2 h-4 w-4" /> Save for later
          </DropdownMenuItem>
        )}
        {deal && (
          <DropdownMenuItem onSelect={() => openPipeline(deal.id)}>
            <KanbanSquare className="mr-2 h-4 w-4" /> Open in pipeline
          </DropdownMenuItem>
        )}
        {deal?.stageId && (
          <DropdownMenuItem onSelect={() => place(null)} disabled={busy}>
            <Undo2 className="mr-2 h-4 w-4" /> Remove from pipeline
          </DropdownMenuItem>
        )}
        {deal && !deal.stageId && (
          <DropdownMenuItem
            disabled={busy}
            onSelect={() =>
              removeDeal.mutate(deal.zpid, { onSuccess: () => toast({ title: "Removed from saved" }), onError: fail })
            }
          >
            <BookmarkX className="mr-2 h-4 w-4" /> Remove from saved
          </DropdownMenuItem>
        )}
        {listingUrl && (
          <DropdownMenuItem asChild>
            <a href={listingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> View original listing
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const size = full ? "default" : "sm";

  // Tracked: a status chip that opens the menu.
  if (deal) {
    return (
      <div className={cn("inline-flex", stretch && "w-full", className)} onClick={stop} onKeyDown={stop}>
        {menu(
          <Button
            variant="outline"
            size={size}
            disabled={busy}
            className={cn("gap-1.5 font-medium", stretch && "w-full justify-between", stage ? "border-transparent text-white" : "text-slate-700")}
            style={stage ? { background: stage.color || "#3B82F6" } : undefined}
            aria-label={stage ? `In pipeline: ${stage.name}. Change stage` : "Saved. Move to pipeline"}
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : stage ? (
                <KanbanSquare className="h-3.5 w-3.5" />
              ) : (
                <Bookmark className="h-3.5 w-3.5 fill-current" />
              )}
              <span className="truncate">{stage ? `In: ${stage.name}` : full ? "Saved · move to pipeline" : "Saved"}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </Button>,
        )}
      </div>
    );
  }

  // Not tracked: split button — primary adds to the first stage.
  return (
    <div className={cn("inline-flex", stretch && "w-full", className)} onClick={stop} onKeyDown={stop}>
      <Button
        size={size}
        variant={full ? "cta" : "default"}
        disabled={busy || !zpid}
        onClick={() => place(undefined)}
        className={cn("gap-1.5 rounded-r-none font-semibold", stretch && "flex-1")}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {full || stages[0] ? "Add to pipeline" : "Add"}
      </Button>
      {menu(
        <Button
          size={size}
          variant={full ? "cta" : "default"}
          disabled={busy || !zpid}
          className="rounded-l-none border-l border-white/25 px-2"
          aria-label="More pipeline options"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>,
      )}
    </div>
  );
}
