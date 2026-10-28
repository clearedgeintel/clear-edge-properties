import { forwardRef, useEffect, useRef, useState } from 'react';
import { ExternalLink, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/score-badge';
import { PropertyImageFallback } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SearchItem } from './adapters';
import { platformInfo } from './platforms';
import { shouldAutoEnrich, useSearchDetail } from './use-search-detail';

interface SearchResultCardProps {
  item: SearchItem;
  selected?: boolean;
  onSelect?: () => void;
  onOpen: () => void;
  onHover?: (hovering: boolean) => void;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'truncate text-sm font-semibold tabular-nums text-foreground',
          tone === 'positive' && 'text-emerald-700',
          tone === 'negative' && 'text-red-600',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export const SearchResultCard = forwardRef<HTMLDivElement, SearchResultCardProps>(function SearchResultCard(
  { item, selected, onSelect, onOpen, onHover },
  forwardedRef,
) {
  const v = item.view;
  const platform = platformInfo(item.platform);
  const [imgError, setImgError] = useState(false);

  // Auto-enrich high scorers lazily, once, when the card scrolls into view.
  const localRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const auto = shouldAutoEnrich(item);
  useEffect(() => {
    const el = localRef.current;
    if (!auto || visible || !el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [auto, visible]);
  // Auto-load failures stay silent on the card; the detail sheet offers a retry.
  const { data: detail } = useSearchDetail(item, auto && visible);

  // Prefer the enriched agent (full name + rating) over the payload brokerage.
  const agent = detail?.agent || v.agent;
  const capRate = v.capRate ?? (v.commercial ? detail?.capRate ?? null : null);

  const specs = v.commercial
    ? [v.type || 'Commercial', v.units != null ? `${v.units} units` : v.sqft != null ? `${v.sqft.toLocaleString()} sqft` : null]
    : [v.beds != null && `${v.beds} bd`, v.baths != null && `${v.baths} ba`, v.sqft != null && `${v.sqft.toLocaleString()} sqft`];

  const primaryMetric = v.commercial
    ? { label: 'Cap rate', value: capRate != null ? `${capRate}%` : '—' }
    : {
        label: 'Est. ROI',
        value: v.estimatedRoi != null ? `${v.estimatedRoi}%` : '—',
        tone: v.estimatedRoi == null ? undefined : v.estimatedRoi >= 0 ? ('positive' as const) : ('negative' as const),
      };
  const secondaryMetric =
    v.commercial && v.noi != null
      ? { label: 'NOI', value: formatCurrency(v.noi) }
      : { label: '$ / sqft', value: v.pricePerSqft != null ? formatCurrency(v.pricePerSqft) : '—' };

  return (
    <div
      ref={(el) => {
        localRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => {
        onSelect?.();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        'group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40',
        selected ? 'border-brand-blue ring-2 ring-brand-blue/30' : 'border-border',
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {v.image && !imgError ? (
          <img
            src={v.image}
            alt={v.street || 'Property photo'}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <PropertyImageFallback />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/35 to-transparent" />

        <span className={cn('absolute left-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-sm', platform.badgeClass)}>
          {platform.shortName}
        </span>
        {v.score != null && (
          <div className="absolute right-3 top-3">
            <ScoreBadge investmentScorePercent={v.score} />
          </div>
        )}
        {(v.isOpportunityZone || v.hasOM) && (
          <div className="absolute bottom-2.5 left-3 flex gap-1.5">
            {v.isOpportunityZone && (
              <Badge className="border-0 bg-white/90 text-[10px] text-emerald-700 hover:bg-white/90">Opportunity Zone</Badge>
            )}
            {v.hasOM && <Badge className="border-0 bg-white/90 text-[10px] text-slate-700 hover:bg-white/90">OM available</Badge>}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight tracking-tight text-brand-navy tabular-nums">
            {v.unpriced ? <span className="text-lg text-slate-500">Contact for price</span> : formatCurrency(v.price)}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-foreground" title={v.street}>
            {v.street || 'Address unavailable'}
          </h3>
          <p className="truncate text-xs text-muted-foreground">{v.cityLine}</p>
          <p className="mt-1.5 truncate text-xs font-medium text-slate-600">{specs.filter(Boolean).join(' · ') || ' '}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric {...primaryMetric} />
          <Metric {...secondaryMetric} />
        </div>

        {/* Agent: de-emphasized, pinned to the bottom so cards line up */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            {agent?.photo ? (
              <img src={agent.photo} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <User className="h-3.5 w-3.5 text-slate-400" />
              </span>
            )}
            <span className="truncate text-xs text-muted-foreground">
              {agent?.name || agent?.company || 'Listing agent in details'}
              {agent?.name && agent?.company && <span className="text-slate-400"> · {agent.company}</span>}
            </span>
          </div>
          {v.listingUrl && (
            <a
              href={v.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-blue"
              aria-label={`View listing on ${platform.name}`}
              title={`View on ${platform.name}`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
});

export function SearchResultCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
        <Skeleton className="h-6 w-2/3" />
      </div>
    </div>
  );
}
