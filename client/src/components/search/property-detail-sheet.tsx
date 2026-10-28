import { useState } from 'react';
import { Link } from 'wouter';
import { ExternalLink, Loader2, Phone, RefreshCw, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScoreBadge } from '@/components/score-badge';
import { DealControl } from '@/components/deal-control';
import { PropertyImageFallback } from '@/components/states';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SearchItem } from './adapters';
import { BuyerMatchRow, CommercialEnrichmentPanel, EnrichmentPanel } from './enrichment';
import { platformInfo } from './platforms';
import { canEnrich, useSearchDetail } from './use-search-detail';

interface PropertyDetailSheetProps {
  item: SearchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Stat({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-3 text-sm font-semibold text-brand-navy">{children}</h4>;
}

export function PropertyDetailSheet({ item, open, onOpenChange }: PropertyDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {item && <SheetBody key={item.key} item={item} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ item }: { item: SearchItem }) {
  const v = item.view;
  const platform = platformInfo(item.platform);
  const [imgError, setImgError] = useState(false);
  const enrichable = canEnrich(item);
  // Opening the sheet loads details (shares the card's cache entry).
  const { data: detail, isFetching, isError, refetch } = useSearchDetail(item, true);

  const agent = detail?.agent || v.agent;
  const agentLocation = [v.city, v.state].filter(Boolean).join(', ');
  const agentLookupHref = agent?.name
    ? `/agent-lookup?name=${encodeURIComponent(agent.name)}${agentLocation ? `&location=${encodeURIComponent(agentLocation)}` : ''}`
    : '';

  const d = (v.commercial ? detail : null) || {};
  const capRate = v.capRate ?? d.capRate ?? null;
  const occupancy = v.occupancy ?? d.occupancy ?? null;
  const yearBuilt = v.yearBuilt ?? d.yearBuilt ?? null;
  const units = v.units ?? d.units ?? null;

  const stats: { label: string; value: string | null }[] = v.commercial
    ? [
        { label: 'Type', value: v.type || 'Commercial' },
        { label: 'Size', value: v.sqft != null ? `${v.sqft.toLocaleString()} sqft` : null },
        { label: 'Units', value: units != null ? String(units) : null },
        { label: 'Cap rate', value: capRate != null ? `${capRate}%` : null },
        { label: 'NOI', value: v.noi != null ? formatCurrency(v.noi) : null },
        { label: 'Occupancy', value: occupancy != null ? `${occupancy}%` : null },
        { label: 'Year built', value: yearBuilt != null ? String(yearBuilt) : null },
      ]
    : [
        { label: 'Beds', value: v.beds != null ? String(v.beds) : null },
        { label: 'Baths', value: v.baths != null ? String(v.baths) : null },
        { label: 'Sq ft', value: v.sqft != null ? v.sqft.toLocaleString() : null },
        { label: 'Est. ROI', value: v.estimatedRoi != null ? `${v.estimatedRoi}%` : null },
        { label: '$ / sqft', value: v.pricePerSqft != null ? formatCurrency(v.pricePerSqft) : null },
        { label: 'Year built', value: yearBuilt != null ? String(yearBuilt) : null },
        { label: 'Type', value: v.type || null },
      ];

  return (
    <div className="pb-8">
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        {v.image && !imgError ? (
          <img src={v.image} alt={v.street} className="h-full w-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <PropertyImageFallback />
        )}
        <span className={cn('absolute left-4 top-4 rounded-md px-2 py-0.5 text-xs font-semibold shadow-sm', platform.badgeClass)}>
          {platform.name}
        </span>
      </div>

      <div className="space-y-7 px-6 pt-5">
        <SheetHeader className="space-y-1 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight text-brand-navy tabular-nums">
                {v.unpriced ? 'Contact for price' : formatCurrency(v.price)}
              </p>
              <SheetTitle className="mt-1 text-base font-semibold">{v.street || 'Address unavailable'}</SheetTitle>
              <SheetDescription>{v.cityLine}</SheetDescription>
            </div>
            {v.score != null && <ScoreBadge investmentScorePercent={v.score} size="lg" showLabel />}
          </div>
        </SheetHeader>

        <DealControl zpid={item.zpid} source={item.dealSource} variant="full" listingUrl={v.listingUrl} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>

        {v.listingUrl && (
          <Button variant="outline" className="w-full" asChild>
            <a href={v.listingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> View listing on {platform.name}
            </a>
          </Button>
        )}

        {agent && (agent.name || agent.company) && (
          <section>
            <SectionTitle>Listing agent</SectionTitle>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                {agent.photo ? (
                  <img src={agent.photo} alt={agent.name || agent.company} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <User className="h-5 w-5 text-slate-400" />
                  </span>
                )}
                <div className="min-w-0">
                  {agent.name ? (
                    <Link href={agentLookupHref} className="block truncate text-sm font-semibold text-brand-blue hover:underline" title="Look up this agent">
                      {agent.name}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-semibold text-foreground">{agent.company}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {agent.name && agent.company && <span className="truncate">{agent.company}</span>}
                    {agent.rating > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-500">
                        <Star className="h-3 w-3" fill="currentColor" />
                        {agent.rating}
                        {agent.reviewCount ? <span className="text-slate-400">({agent.reviewCount})</span> : null}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {agent.phone && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${agent.phone}`}>
                    <Phone className="mr-1.5 h-3.5 w-3.5" /> {agent.phone}
                  </a>
                </Button>
              )}
            </div>
          </section>
        )}

        {enrichable && (
          <section>
            <SectionTitle>Property details</SectionTitle>
            {isFetching && !detail ? (
              <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading full details…
              </p>
            ) : isError && !detail ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3 text-sm text-muted-foreground">
                Couldn't load details.
                <Button size="sm" variant="ghost" onClick={() => refetch()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ) : detail ? (
              // The panels draw their own top divider for in-card use; drop it here.
              <div className="[&>div]:mt-0 [&>div]:border-t-0 [&>div]:pt-0">
                {v.commercial ? <CommercialEnrichmentPanel detail={detail} /> : <EnrichmentPanel detail={detail} />}
              </div>
            ) : null}
          </section>
        )}

        <section className="[&>div]:mt-0 [&>div]:border-t-0 [&>div]:pt-0">
          <SectionTitle>Cash buyers</SectionTitle>
          <BuyerMatchRow property={item.raw} />
        </section>
      </div>
    </div>
  );
}
