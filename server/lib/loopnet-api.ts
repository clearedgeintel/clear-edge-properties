import fetch from 'node-fetch';

export interface LoopNetSearchRequest {
  location: string;
  propertyTypes?: string[];
  priceMin?: number;
  priceMax?: number;
  sqftMin?: number;
  sqftMax?: number;
  maxResults?: number;
}

export interface LoopNetProperty {
  id: string;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  };
  propertyType: string;
  price: number;
  pricePerSqft: number;
  sqft: number;
  description: string;
  images: string[];
  listingDate: string;
  capRate?: number;
  noi?: number;
  yearBuilt?: number;
  parking?: number;
  url: string;
  latitude?: number;
  longitude?: number;
  broker?: {
    name?: string;
    company?: string;
    phone?: string;
    photo?: string;
    profileUrl?: string;
  };
}

export interface LoopNetPropertyDetails extends LoopNetProperty {
  detailedDescription: string;
  amenities: string[];
  zoning: string;
  expenses: {
    taxes?: number;
    insurance?: number;
    maintenance?: number;
  };
  tenants?: Array<{
    name: string;
    sqft: number;
    rent: number;
    leaseExpiry: string;
  }>;
}

export class LoopNetApiService {
  private readonly baseUrl = 'https://loopnet-api.p.rapidapi.com';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    if (!this.apiKey) {
      throw new Error('RAPIDAPI_KEY environment variable is required for LoopNet API');
    }
  }

  private async makeRequest(endpoint: string, body: Record<string, any> = {}): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-RapidAPI-Host': 'loopnet-api.p.rapidapi.com',
          'X-RapidAPI-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`LoopNet API error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('LoopNet API request failed:', error);
      throw error;
    }
  }

  // Resolve a free-text location ("Austin, TX") to a LoopNet cityId via the
  // helper/findCity endpoint, preferring a match whose state matches.
  private async findCityId(location: string): Promise<string | null> {
    const parts = location.split(',').map(p => p.trim()).filter(Boolean);
    const cityName = parts[0] || location;
    const state = (parts[1] || '').toUpperCase();

    const response = await this.makeRequest('/loopnet/helper/findCity', { keywords: cityName });
    const matches: any[] = response.data || [];
    if (matches.length === 0) return null;

    if (state) {
      const stateMatch = matches.find(
        m => (m.address?.state || '').toUpperCase() === state,
      );
      if (stateMatch) return stateMatch.id?.toString() || null;
    }
    return matches[0].id?.toString() || null;
  }

  async searchProperties(params: LoopNetSearchRequest): Promise<LoopNetProperty[]> {
    try {
      const cityId = await this.findCityId(params.location);
      if (!cityId) {
        console.warn(`LoopNet: no city match for "${params.location}"`);
        return [];
      }

      // searchByCity returns only { listingId, coordinations } — the detail
      // endpoint (SaleDetails) carries the real address/price/images, so we
      // fan out one detail call per listing (capped by maxResults).
      const response = await this.makeRequest('/loopnet/sale/searchByCity', { cityId });
      const listings: any[] = Array.isArray(response.data) ? response.data : [];

      const detailedProperties = await Promise.all(
        listings.slice(0, params.maxResults || 20).map(async (listing: any) => {
          const listingId = (listing.listingId ?? listing.listingID)?.toString();
          if (!listingId) return null;
          try {
            const details = await this.getPropertyDetails(listingId);
            return details && details.price > 0 ? details : null;
          } catch (error) {
            console.error(`LoopNet detail error for ${listingId}:`, error);
            return null;
          }
        }),
      );

      let results = detailedProperties.filter(Boolean) as LoopNetProperty[];

      // Apply client-side price/sqft filters (the city search has no filtering).
      if (params.priceMin != null) results = results.filter(p => p.price >= params.priceMin!);
      if (params.priceMax != null) results = results.filter(p => p.price <= params.priceMax!);
      if (params.sqftMin != null) results = results.filter(p => !p.sqft || p.sqft >= params.sqftMin!);
      if (params.sqftMax != null) results = results.filter(p => !p.sqft || p.sqft <= params.sqftMax!);

      return results;
    } catch (error) {
      console.error('LoopNet search error:', error);
      return [];
    }
  }

  async getPropertyDetails(propertyId: string): Promise<LoopNetPropertyDetails | null> {
    try {
      const response = await this.makeRequest('/loopnet/property/SaleDetails', {
        listingId: propertyId
      });

      if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.warn(`No property sale details found for ${propertyId}`);
        return null;
      }

      const propertyData = response.data[0];
      console.log('LoopNet SaleDetails keys:', Object.keys(propertyData));
      console.log('LoopNet SaleDetails sample data:', {
        listingId: propertyData.listingId,
        title: propertyData.title,
        location: JSON.stringify(propertyData.location),
        aboutAddress: propertyData.aboutAddress,
        price: propertyData.price,
        category: propertyData.category,
        subCategory: propertyData.subCategory
      });

      return this.parseDetailedProperty(response.data);
    } catch (error) {
      console.error(`Error fetching property sale details for ${propertyId}:`, error);
      return null;
    }
  }

  private parseDetailedProperty(propertyResponse: any): LoopNetPropertyDetails {
    // SaleDetails returns an array; the listing is the first element.
    const property = Array.isArray(propertyResponse) ? propertyResponse[0] : propertyResponse;

    if (!property) {
      throw new Error('No property data in response');
    }

    const location = property.location || {};
    const facts = property.propertyFacts || {};

    const streetAddress = location.streetAddress || location.address || property.title || 'Commercial Property';
    const city = location.city || location.addressLocality || '';
    const state = location.state || location.addressRegion || '';
    const zipCode = location.zipCode || location.postalCode || '';

    // price is a plain string (e.g. "4000000"); facts.price is display ("$4,000,000").
    const price = this.parseNumber(property.price) || this.parseNumber(facts.price) || 0;

    // Building size lives in propertyFacts as a display string ("10,000 SF" or
    // "4.22 AC" for land). parseSize handles SF and acre units.
    const sqft = this.parseSize(facts.buildingSize || facts.rentableBuildingArea || facts.totalLotSize);

    const propertyType = facts.propertyType || facts.propertySubtype || property.category || property.subCategory || 'Commercial';

    const pricePerSqft = this.parseNumber(property.pricePerSquareFoot)
      ?? (sqft > 0 && price > 0 ? Math.round(price / sqft) : 0);

    // googleMapsUrl embeds "place/<lat> <lon>".
    let latitude: number | undefined;
    let longitude: number | undefined;
    const geo = (property.googleMapsUrl || '').match(/place\/(-?\d+\.?\d*)\+?(-?\d+\.?\d*)/);
    if (geo) {
      latitude = parseFloat(geo[1]);
      longitude = parseFloat(geo[2]);
    }

    const brokerRaw = Array.isArray(property.broker) ? property.broker[0] : property.broker;
    const broker = brokerRaw
      ? {
          name: brokerRaw.name || undefined,
          company: brokerRaw.worksFor?.name || undefined,
          phone: brokerRaw.phoneNumber || property.listingPhoneNumber || undefined,
          photo: brokerRaw.image || undefined,
          profileUrl: brokerRaw.url || undefined,
        }
      : undefined;

    const baseProperty: LoopNetProperty = {
      id: property.listingId?.toString() || '',
      address: { streetAddress, city, state, zipCode },
      propertyType,
      price,
      pricePerSqft: pricePerSqft || 0,
      sqft,
      description: property.summary || property.description || `LoopNet Listing ${property.listingId}`,
      images: this.parseImages(property.images || []),
      listingDate: property.createdAt || property.lastUpdated || new Date().toISOString(),
      capRate: this.parseNumber(facts.capRate) || 0,
      noi: this.parseNumber(facts.noi) || 0,
      yearBuilt: this.parseNumber(facts.yearBuilt),
      parking: this.parseNumber(facts.parkingSpaces),
      url: `https://www.loopnet.com/Listing/${property.listingId}/`,
      latitude,
      longitude,
      broker,
    };

    return {
      ...baseProperty,
      detailedDescription: property.summary || property.description || baseProperty.description,
      amenities: this.parseAmenities(property.amenities || property.highlights || []),
      zoning: facts.zoning || property.zoning?.zoningCode || '',
      expenses: {
        taxes: this.parseNumber(property.propertyTaxes?.find?.((t: any) => t.totalAssessment)?.totalAssessment),
        insurance: undefined,
        maintenance: undefined,
      },
      tenants: this.parseTenants(property.majorTenants || property.units || []),
    };
  }

  // Parse a LoopNet size display string into square feet. Handles "10,000 SF"
  // and acre values ("4.22 AC" → ×43,560).
  private parseSize(value: any): number {
    if (value == null) return 0;
    const str = value.toString();
    const num = parseFloat(str.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return 0;
    return /ac/i.test(str) ? Math.round(num * 43560) : Math.round(num);
  }
  
  private parseAmenities(amenities: any): string[] {
    if (!amenities) return [];
    if (Array.isArray(amenities)) {
      return amenities.map(a => typeof a === 'string' ? a : a.name || a.feature || '').filter(Boolean);
    }
    if (typeof amenities === 'object') {
      return Object.values(amenities).map(String).filter(Boolean);
    }
    return [];
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value.replace(/[,$]/g, '')) : Number(value);
    return isNaN(num) ? undefined : num;
  }

  private parseImages(images: any[]): string[] {
    if (!Array.isArray(images)) return [];
    return images
      .map(img => typeof img === 'string' ? img : img.url || img.src)
      .filter(url => url && typeof url === 'string');
  }

  private parseTenants(tenants: any[]): Array<{name: string; sqft: number; rent: number; leaseExpiry: string}> {
    if (!Array.isArray(tenants)) return [];
    
    return tenants.map(tenant => ({
      name: tenant.name || tenant.tenantName || 'Unknown Tenant',
      sqft: this.parseNumber(tenant.sqft || tenant.squareFeet) || 0,
      rent: this.parseNumber(tenant.rent || tenant.monthlyRent) || 0,
      leaseExpiry: tenant.leaseExpiry || tenant.expiry || ''
    }));
  }
}

export const loopNetApi = new LoopNetApiService();