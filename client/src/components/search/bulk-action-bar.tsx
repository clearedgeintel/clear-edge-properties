import { useState } from 'react';
import { useLocation } from 'wouter';
import { Bookmark, ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useDealActions, useDeals } from '@/lib/deals';
import type { SearchItem } from './adapters';

interface BulkActionBarProps {
  items: SearchItem[];
  onClear: () => void;
}

/** Sticky bar for acting on several selected search results at once. */
export function BulkActionBar({ items, onClear }: BulkActionBarProps) {
  const { stages } = useDeals();
  const { addDeal } = useDealActions();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false);

  /** stageId: undefined → first stage, null → save only. */
  const run = async (stageId?: string | null) => {
    setBusy(true);
    const outcomes = await Promise.allSettled(
      items.map((it) => addDeal.mutateAsync({ source: it.dealSource, stageId })),
    );
    setBusy(false);
    const ok = outcomes.filter((o) => o.status === 'fulfilled').length;
    const failed = outcomes.length - ok;
    const target =
      stageId === null ? 'saved' : `added to ${stages.find((s) => s.id === (stageId ?? stages[0]?.id))?.name ?? 'pipeline'}`;
    toast({
      title: `${ok} ${ok === 1 ? 'property' : 'properties'} ${target}`,
      description: failed ? `${failed} couldn't be added. Try them individually.` : undefined,
      variant: failed && !ok ? 'destructive' : undefined,
      action: ok ? (
        <ToastAction altText="View pipeline" onClick={() => navigate('/deals')}>
          View pipeline
        </ToastAction>
      ) : undefined,
    });
    if (ok) onClear();
  };

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6 lg:pl-64">
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-brand-navy py-1.5 pl-4 pr-1.5 text-white shadow-2xl shadow-brand-navy/30"
      >
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{items.length} selected</span>
        <div className="mx-1 h-5 w-px bg-white/20" />
        <div className="inline-flex">
          <Button size="sm" variant="cta" className="rounded-l-full rounded-r-none" disabled={busy} onClick={() => run(undefined)}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            Add to pipeline
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="cta"
                className="rounded-l-none rounded-r-full border-l border-white/25 px-2"
                disabled={busy}
                aria-label="Choose stage"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52">
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Add to stage
              </DropdownMenuLabel>
              {stages.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => run(s.id)}>
                  <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ background: s.color || '#3B82F6' }} />
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button size="sm" variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white" disabled={busy} onClick={() => run(null)}>
          <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
