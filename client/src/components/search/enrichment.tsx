import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { ExternalLink, GraduationCap, Loader2, Phone, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';

// Detail panels for search results, moved from pages/property-search.tsx.

// Redfin's detail endpoint returns a different shape than Zillow's; map the
// overlapping fields onto the names EnrichmentPanel reads (it null-guards the
// rest, so Zillow-only fields like schools/climate just don't render).
export function normalizeRedfinDetail(d: any) {
  if (!d) return d;
  return {
    source: 'redfin',
    zestimate: d.valueEstimate ?? null,
    rentZestimate: d.rentEstimate ?? null,
    yearBuilt: d.yearBuilt ?? null,
    lotSize: d.lotSize ?? null,
    pricePerSqft: d.pricePerSqft ?? null,
    daysOnZillow: d.daysOnMarket ?? null,
    description: d.description ?? null,
    priceHistory: Array.isArray(d.priceHistory) ? d.priceHistory : [],
    schools: [],
    climateRisks: [],
    agent: d.agent ?? null,
    mlsId: d.mlsId ?? null,
  };
}

// "Find cash buyers" — matches this result against the tenant's buyer buy-boxes.
export function BuyerMatchRow({ property }: { property: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; buyers: any[] } | null>(null);

  const findBuyers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/buyers/match', {
        zip: property.address?.zipCode || null,
        city: property.address?.city || null,
        state: property.address?.state || null,
        beds: typeof property.bedrooms === 'number' ? property.bedrooms : null,
        baths: typeof property.bathrooms === 'number' ? property.bathrooms : null,
        price: typeof property.price === 'number' ? property.price : null,
        homeType: property.propertyType || null,
      });
      setResult(await res.json());
    } catch {
      setResult({ count: 0, buyers: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {!result ? (
        <Button variant="ghost" size="sm" className="text-slate-600" onClick={findBuyers} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
          Find cash buyers
        </Button>
      ) : result.count === 0 ? (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Wallet className="w-3.5 h-3.5" /> No buyers match this property's buy box yet.
        </p>
      ) : (
        <div>
          <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5 mb-1">
            <Wallet className="w-4 h-4" /> {result.count} cash buyer{result.count > 1 ? 's' : ''} want this
          </p>
          <ul className="space-y-1">
            {result.buyers.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate flex items-center gap-1.5">
                  {b.name}
                  {b.company && <span className="text-slate-400 text-xs truncate">· {b.company}</span>}
                  {b.proofOfFunds && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                </span>
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="inline-flex items-center text-brand-blue hover:underline whitespace-nowrap text-xs">
                    <Phone className="w-3.5 h-3.5 mr-0.5" />{b.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
          {result.count > 5 && <p className="text-xs text-slate-400 mt-1">+{result.count - 5} more</p>}
        </div>
      )}
    </div>
  );
}

// Commercial detail (Crexi /listingdetails): units, occupancy, cap rate, etc.
export function CommercialEnrichmentPanel({ detail }: { detail: any }) {
  const stats: Array<{ label: string; value: string | null }> = [
    { label: 'Units', value: detail.units != null ? String(detail.units) : null },
    { label: 'Building SF', value: detail.squareFootage != null ? Number(detail.squareFootage).toLocaleString() : null },
    { label: 'Occupancy', value: detail.occupancy != null ? `${detail.occupancy}%` : null },
    { label: 'Cap rate', value: detail.capRate != null ? `${detail.capRate}%` : null },
    { label: 'Year built', value: detail.yearBuilt != null ? String(detail.yearBuilt) : null },
    { label: 'Buildings', value: detail.buildings != null ? String(detail.buildings) : null },
    { label: 'Stories', value: detail.stories != null ? String(detail.stories) : null },
    { label: 'Lot', value: detail.lotAcres != null ? `${detail.lotAcres} ac` : null },
  ].filter((s) => s.value);

  if (!stats.length && !detail.subtype && !detail.description) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
      {detail.subtype && (
        <p className="text-xs text-slate-500">
          Subtype: <span className="font-medium text-slate-700">{detail.subtype}</span>
        </p>
      )}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-sm font-medium text-slate-700">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {detail.description && (
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{detail.description}</p>
      )}
    </div>
  );
}

export function EnrichmentPanel({ detail }: { detail: any }) {
  const fmtMoney = (n: number | null | undefined) =>
    n != null ? `$${Math.round(n).toLocaleString()}` : null;

  const isRedfin = detail.source === 'redfin';
  const stats: Array<{ label: string; value: string | null }> = [
    { label: isRedfin ? 'Redfin est.' : 'Zestimate', value: fmtMoney(detail.zestimate) },
    { label: 'Rent est.', value: detail.rentZestimate != null ? `${fmtMoney(detail.rentZestimate)}/mo` : null },
    { label: 'Year built', value: detail.yearBuilt != null ? String(detail.yearBuilt) : null },
    { label: 'Lot', value: detail.lotSize != null ? `${detail.lotSize.toLocaleString()} sqft` : null },
    { label: '$/sqft', value: detail.pricePerSqft != null ? `$${detail.pricePerSqft}` : null },
    { label: 'Tax assessed', value: fmtMoney(detail.taxAssessedValue) },
    { label: 'Annual tax', value: fmtMoney(detail.annualTax) },
    { label: 'HOA', value: detail.hoaFeeMonthly != null ? `${fmtMoney(detail.hoaFeeMonthly)}/mo` : null },
    { label: isRedfin ? 'Days on market' : 'Days on Zillow', value: detail.daysOnZillow != null ? String(detail.daysOnZillow) : null },
  ].filter((s) => s.value);

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
      {detail.estimatedSalesRange && (
        <p className="text-xs text-slate-500">
          Est. sale range: <span className="font-medium text-slate-700">{fmtMoney(detail.estimatedSalesRange.low)}–{fmtMoney(detail.estimatedSalesRange.high)}</span>
        </p>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-slate-50 rounded p-2 text-center">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(detail.climateRisks) && detail.climateRisks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          {detail.climateRisks.map((r: any) => (
            <Badge key={r.type} variant="outline" className="text-[10px] capitalize">
              {r.type}: {r.label.toLowerCase()}
            </Badge>
          ))}
        </div>
      )}

      {Array.isArray(detail.schools) && detail.schools.length > 0 && (
        <div className="text-xs text-slate-600">
          <p className="flex items-center gap-1 font-medium text-slate-700 mb-1">
            <GraduationCap className="w-3.5 h-3.5" /> Schools
          </p>
          <ul className="space-y-0.5">
            {detail.schools.slice(0, 3).map((s: any, i: number) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{s.name}{s.level ? ` · ${s.level}` : ''}</span>
                {s.rating != null && <span className="text-slate-400 whitespace-nowrap">{s.rating}/10</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.description && (
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{detail.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs">
        {Array.isArray(detail.priceHistory) && detail.priceHistory.length > 0 && (
          <span className="text-slate-500">{detail.priceHistory.length} price-history events</span>
        )}
        {detail.virtualTour && (
          <a href={detail.virtualTour} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-brand-blue hover:underline ml-auto">
            <ExternalLink className="w-3.5 h-3.5 mr-0.5" /> Virtual tour
          </a>
        )}
      </div>
    </div>
  );
}
