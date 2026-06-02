import fetch from 'node-fetch';
import type { LoopNetProperty } from './loopnet-api';

// ─── Crexi (Unofficial) API ──────────────────────────────────────────────────
// Commercial listings via the "Unofficial Crexi Data" RapidAPI product. The
// search endpoint needs city + state code + lat/lng, all of which come from the
// suggestions endpoint. Results map onto the commercial LoopNetProperty shape so
// they can flow through the existing commercial scorer / unified converters.

export interface CrexiSearchRequest {
  location: string;
  priceMin?: number;
  priceMax?: number;
  maxResults?: number;
}

interface CrexiSuggestion {
  mainText: string;
  code: string;
  coordinates: { lat: number; lng: number };
}

// Structured detail from /listingdetails — the commercial financials the search
// payload doesn't carry.
export interface CrexiListingDetail {
  units?: number;
  squareFootage?: number;
  occupancy?: number; // percent
  yearBuilt?: number;
  buildings?: number;
  stories?: number;
  lotAcres?: number;
  subtype?: string;
  capRate?: number;
  isOpportunityZone?: boolean;
  hasOM?: boolean;
  pricePerItemType?: string; // "Unit" | "SqFt"
  description?: string;
  highlights?: string;
}

export class CrexiApiService {
  private readonly baseUrl = 'https://unofficial-crexi-data.p.rapidapi.com';
  private readonly host = 'unofficial-crexi-data.p.rapidapi.com';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    if (!this.apiKey) {
      throw new Error('RAPIDAPI_KEY environment variable is required for Crexi API');
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Host': this.host,
        'X-RapidAPI-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Crexi API error: ${response.status} - ${response.statusText}`);
    }
    return await response.json();
  }

  private async resolveLocation(location: string): Promise<CrexiSuggestion | null> {
    const response = await this.makeRequest('/suggestions', { keyword: location });
    const suggestions: any[] = response?.data || [];
    const first = suggestions.find(s => s.coordinates?.lat && s.code) || suggestions[0];
    if (!first) return null;
    return {
      mainText: first.mainText || location,
      code: first.code || '',
      coordinates: first.coordinates || { lat: 0, lng: 0 },
    };
  }

  async searchProperties(params: CrexiSearchRequest): Promise<LoopNetProperty[]> {
    try {
      const place = await this.resolveLocation(params.location);
      if (!place) {
        console.warn(`Crexi: no location match for "${params.location}"`);
        return [];
      }

      const response = await this.makeRequest('/search', {
        city: place.mainText,
        code: place.code,
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
        sort: 'recommended',
      });

      const listings: any[] = Array.isArray(response?.data) ? response.data : [];
      let results = listings.map(l => this.parseListing(l));

      if (params.priceMin != null) results = results.filter(p => p.price >= params.priceMin!);
      if (params.priceMax != null) results = results.filter(p => !p.price || p.price <= params.priceMax!);

      return params.maxResults ? results.slice(0, params.maxResults) : results;
    } catch (error) {
      console.error('Crexi search error:', error);
      return [];
    }
  }

  private parseListing(listing: any): LoopNetProperty {
    const loc = (Array.isArray(listing.locations) ? listing.locations[0] : listing.locations) || {};
    const state = typeof loc.state === 'object' ? (loc.state?.code || '') : (loc.state || '');
    const slug = listing.urlSlug ? `/${listing.urlSlug}` : '';
    const desc: string = listing.description || listing.name || '';

    // The search payload embeds some metrics only in the description string,
    // e.g. "Multifamily | 25 Units", "Retail | 7.75% CAP | 6,175 SqFt".
    const units = this.matchNum(desc, /([\d,]+)\s*units?/i);
    const capRate = this.matchNum(desc, /([\d.]+)\s*%\s*cap/i);

    const sqft = Number(listing.squareFootage) || 0;
    const price = Number(listing.askingPrice) || 0;

    return {
      id: (listing.id ?? '').toString(),
      address: {
        streetAddress: loc.address || listing.name || '',
        city: loc.city || '',
        state,
        zipCode: loc.zip || '',
      },
      propertyType: Array.isArray(listing.types) && listing.types.length > 0 ? listing.types[0] : 'Commercial',
      price,
      unpriced: !price, // no askingPrice → "Contact for price", not a real $0
      pricePerSqft: price && sqft ? Math.round(price / sqft) : 0,
      sqft,
      units,
      capRate,
      investmentType: listing.investmentType || undefined,
      isOpportunityZone: !!listing.isInOpportunityZone,
      hasOM: !!listing.hasOM,
      description: desc,
      images: listing.thumbnailUrl ? [listing.thumbnailUrl] : [],
      listingDate: listing.activatedOn || listing.updatedOn || new Date().toISOString(),
      noi: undefined,
      yearBuilt: undefined,
      parking: undefined,
      url: `https://www.crexi.com/properties/${listing.id}${slug}`,
      urlSlug: listing.urlSlug || undefined,
      latitude: loc.latitude,
      longitude: loc.longitude,
      broker: listing.brokerageName
        ? { company: listing.brokerageName, photo: listing.brokerTeamLogoUrl || undefined }
        : undefined,
    };
  }

  private matchNum(text: string, re: RegExp): number | undefined {
    const m = text.match(re);
    if (!m) return undefined;
    const n = Number(m[1].replace(/,/g, ''));
    return isNaN(n) ? undefined : n;
  }

  // Structured listing detail (units, occupancy, cap rate, year built, …).
  async getListingDetails(id: string, urlSlug?: string): Promise<CrexiListingDetail | null> {
    try {
      const response = await this.makeRequest('/listingdetails', { id, urlSlug });
      const d = response?.data;
      if (!d) return null;

      const sd: any[] = Array.isArray(d.summaryDetails) ? d.summaryDetails : [];
      const val = (key: string) => sd.find((x) => x.key === key)?.value;
      const toNum = (v: any): number | undefined => {
        if (v == null) return undefined;
        const n = Number(String(v).replace(/[,%]/g, ''));
        return isNaN(n) ? undefined : n;
      };
      const stripHtml = (h: any): string =>
        (typeof h === 'string' ? h : '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

      const highlights = stripHtml(d.investmentHighlights);
      const marketing = stripHtml(d.marketingDescription);
      const subType = val('SubType');

      return {
        units: toNum(val('Units')),
        squareFootage: toNum(val('SquareFootage')),
        occupancy: toNum(val('Occupancy')),
        yearBuilt: toNum(val('YearBuilt')),
        buildings: toNum(val('Buildings')),
        stories: toNum(val('Stories')),
        lotAcres: toNum(val('LotSize')),
        subtype: Array.isArray(d.subtypes) ? d.subtypes[0] : (Array.isArray(subType) ? subType[0] : subType) || undefined,
        capRate: this.matchNum(`${highlights} ${marketing}`, /([\d.]+)\s*%\s*cap/i),
        isOpportunityZone: !!d.isInOpportunityZone,
        hasOM: !!d.hasOM,
        pricePerItemType: d.pricePerItemType || undefined,
        description: marketing || undefined,
        highlights: highlights || undefined,
      };
    } catch (error) {
      console.error('Crexi listing detail error:', error);
      return null;
    }
  }
}

export const crexiApi = new CrexiApiService();
