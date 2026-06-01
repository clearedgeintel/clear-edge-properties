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

    return {
      id: (listing.id ?? '').toString(),
      address: {
        streetAddress: loc.address || listing.name || '',
        city: loc.city || '',
        state,
        zipCode: loc.zip || '',
      },
      propertyType: Array.isArray(listing.types) && listing.types.length > 0 ? listing.types[0] : 'Commercial',
      price: Number(listing.askingPrice) || 0,
      // Crexi search results don't expose building size; left at 0 so the
      // commercial scorer treats price-per-sqft / cap rate as unknown.
      pricePerSqft: 0,
      sqft: 0,
      description: listing.description || listing.name || '',
      images: listing.thumbnailUrl ? [listing.thumbnailUrl] : [],
      listingDate: listing.activatedOn || listing.updatedOn || new Date().toISOString(),
      capRate: undefined,
      noi: undefined,
      yearBuilt: undefined,
      parking: undefined,
      url: `https://www.crexi.com/properties/${listing.id}${slug}`,
      latitude: loc.latitude,
      longitude: loc.longitude,
      broker: listing.brokerageName
        ? { company: listing.brokerageName, photo: listing.brokerTeamLogoUrl || undefined }
        : undefined,
    };
  }
}

export const crexiApi = new CrexiApiService();
