import type { MapPoint } from '@/components/property-map';
import { formatHomeType } from '@/lib/format';
import { isCommercialPlatform } from './platforms';

/**
 * Search results are the cross-platform UnifiedProperty shape (plus each
 * per-platform endpoint's raw variant), not a DB Property. These helpers give
 * the UI one normalized view so cards, the sheet and the map agree.
 */

export interface SearchResult {
  platform: string;
  totalFound: number;
  imported: number;
  errors: number;
  properties: any[];
  errorMessages: string[];
  duplicates?: number;
  saveMessage?: string;
}

/** A result row tagged with its platform and a stable id across platforms. */
export interface SearchItem {
  key: string;
  platform: string;
  raw: any;
  view: ResultView;
}

export interface ResultAgent {
  name?: string;
  company?: string;
  photo?: string;
  rating?: number;
  reviewCount?: number;
  phone?: string;
}

export interface ResultView {
  street: string;
  city: string;
  state: string;
  zip: string;
  cityLine: string;
  price: number | null;
  unpriced: boolean;
  score: number | null;
  image: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  units: number | null;
  yearBuilt: number | null;
  type: string;
  estimatedRoi: number | null;
  capRate: number | null;
  noi: number | null;
  pricePerSqft: number | null;
  occupancy: number | null;
  isOpportunityZone: boolean;
  hasOM: boolean;
  listingUrl: string | null;
  agent: ResultAgent | null;
  lat: number | null;
  lng: number | null;
  commercial: boolean;
}

export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const positive = (v: unknown): number | null => {
  const n = toNum(v);
  return n != null && n > 0 ? n : null;
};

export function readResult(p: any, platform: string): ResultView {
  const addr = p.address ?? {};
  const isStr = typeof addr === 'string';
  const street = (isStr ? addr : addr.streetAddress) || '';
  const city = (isStr ? '' : addr.city) || p.city || '';
  const state = (isStr ? '' : addr.state) || p.state || '';
  const zip = (isStr ? '' : addr.zipCode) || p.zipcode || '';
  const sqft = positive(p.sqft ?? p.sizeSqFt);
  const price = positive(p.price);

  return {
    street,
    city,
    state,
    zip,
    cityLine: [city, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : ''),
    price,
    unpriced: Boolean(p.unpriced) || price == null,
    // The unified converters default missing score/ROI to 0 / "0.00", so zero
    // means "not scored", not a real value.
    score: positive(p.score ?? p.investmentScorePercent),
    image: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
    beds: positive(p.bedrooms ?? p.numBeds),
    baths: positive(p.bathrooms ?? p.numBaths),
    sqft,
    units: positive(p.units),
    yearBuilt: positive(p.yearBuilt),
    type: [formatHomeType(p.propertyType || p.homeType), p.subtype].filter(Boolean).join(' · '),
    estimatedRoi: toNum(p.estimatedRoi) || null,
    capRate: toNum(p.capRate),
    noi: positive(p.noi),
    pricePerSqft: positive(p.pricePerSqft) ?? (price && sqft ? Math.round(price / sqft) : null),
    occupancy: toNum(p.occupancy),
    isOpportunityZone: Boolean(p.isOpportunityZone),
    hasOM: Boolean(p.hasOM),
    listingUrl: p.listingUrl || p.url || null,
    agent: p.agent ?? null,
    lat: toNum(p.latitude ?? p.lat ?? p.coordinates?.latitude ?? p.coordinates?.lat ?? p.metrics?.latitude),
    lng: toNum(p.longitude ?? p.lng ?? p.coordinates?.longitude ?? p.coordinates?.lng ?? p.metrics?.longitude),
    commercial: isCommercialPlatform(platform),
  };
}

export function toSearchItems(results: SearchResult[]): SearchItem[] {
  return results.flatMap((r) =>
    r.properties.map((raw, i) => ({
      key: `${r.platform}:${raw.id ?? raw.zpid ?? i}`,
      platform: r.platform,
      raw,
      view: readResult(raw, r.platform),
    })),
  );
}

export function searchItemToMapPoint(item: SearchItem): MapPoint {
  const v = item.view;
  return {
    id: item.key,
    lat: v.lat,
    lng: v.lng,
    score: v.score,
    price: v.price,
    title: v.street || 'Property',
    subtitle: v.cityLine,
    beds: v.beds,
    baths: v.baths,
    sqft: v.sqft,
    capRate: v.capRate,
    image: v.image,
  };
}
