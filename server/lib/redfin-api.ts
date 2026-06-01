import fetch from 'node-fetch';

export interface RedfinSearchRequest {
  location: string;
  priceMin?: number;
  priceMax?: number;
  bedsMin?: number;
  bedsMax?: number;
  bathsMin?: number;
  bathsMax?: number;
  sqftMin?: number;
  sqftMax?: number;
  homeType?: string;
  maxResults?: number;
}

export interface RedfinProperty {
  id: string;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  };
  propertyType: string;
  price: number;
  pricePerSqft?: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
  lotSize?: number;
  images: string[];
  listingDate: string;
  daysOnMarket?: number;
  description?: string;
  url: string;
  mlsId?: string;
  status: string;
  priceHistory?: Array<{
    date: string;
    price: number;
    event: string;
  }>;
  marketStats?: {
    medianSalePrice?: number;
    medianDaysOnMarket?: number;
    soldLastMonth?: number;
  };
  // Detail-only enrichment (Redfin AVM / Rent estimate).
  valueEstimate?: number;
  rentEstimate?: number;
}

export class RedfinApiService {
  private readonly baseUrl = 'https://redfin-com-data.p.rapidapi.com';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    if (!this.apiKey) {
      throw new Error('RAPIDAPI_KEY environment variable is required for Redfin API');
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      
      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-RapidAPI-Host': 'redfin-com-data.p.rapidapi.com',
          'X-RapidAPI-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Redfin API error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Redfin API request failed:', error);
      throw error;
    }
  }

  async searchProperties(params: RedfinSearchRequest): Promise<RedfinProperty[]> {
    try {
      // /property/search resolves a free-text location itself (city, address or
      // ZIP) — no regionId lookup needed. Results are under data.homes[].
      const searchParams: Record<string, string | number> = {
        location: params.location,
        search_type: 'ForSale',
      };

      if (params.priceMin) searchParams['min_price'] = params.priceMin;
      if (params.priceMax) searchParams['max_price'] = params.priceMax;
      if (params.bedsMin) searchParams['min_bedroom'] = params.bedsMin;
      if (params.bedsMax) searchParams['max_bedroom'] = params.bedsMax;
      if (params.bathsMin) searchParams['min_bathroom'] = params.bathsMin;
      if (params.sqftMin) searchParams['min_square_feet'] = params.sqftMin;
      if (params.sqftMax) searchParams['max_square_feet'] = params.sqftMax;
      if (params.homeType) searchParams['home_type'] = params.homeType;

      const response = await this.makeRequest('/property/search', searchParams);

      const homes: any[] = response?.data?.homes;
      if (!Array.isArray(homes)) {
        console.log('Redfin API unexpected response shape:', response?.message || response?.status);
        return [];
      }

      const limited = params.maxResults ? homes.slice(0, params.maxResults) : homes;
      return limited.map((property: any) => this.parseProperty(property));
    } catch (error) {
      console.error('Error searching Redfin properties:', error);
      return [];
    }
  }

  // Redfin wraps most fields as { level, value }; this unwraps to the value.
  private rfVal(field: any): any {
    if (field && typeof field === 'object' && 'value' in field) return field.value;
    return field;
  }

  private uiPropertyTypeName(code: number): string {
    const map: Record<number, string> = {
      1: 'Single Family',
      2: 'Condo',
      3: 'Townhouse',
      4: 'Multi-Family',
      5: 'Land',
      6: 'Manufactured',
      7: 'Other',
    };
    return map[code] || 'Single Family';
  }

  // `urlOrPath` is the listing url from search results (relative path
  // "/TX/Austin/.../home/31513044" or a full redfin.com URL). /property/detail
  // returns Redfin's full page bundle; we pull the structured panels out of it.
  async getPropertyDetails(urlOrPath: string): Promise<RedfinProperty | null> {
    try {
      const response = await this.makeRequest('/property/detail', { url: urlOrPath });

      const data = response?.data;
      if (!data || !data.aboveTheFold) {
        console.log('Redfin detail unexpected response shape:', response?.message || response?.status);
        return null;
      }

      return this.parseDetailedProperty(data);
    } catch (error) {
      console.error(`Error fetching Redfin property details for ${urlOrPath}:`, error);
      return null;
    }
  }

  async getMarketStats(location: string): Promise<any> {
    try {
      const response = await this.makeRequest('/market/stats', {
        location: location
      });

      return {
        location,
        medianSalePrice: this.parseNumber(response.median_sale_price),
        medianDaysOnMarket: this.parseNumber(response.median_days_on_market),
        soldLastMonth: this.parseNumber(response.sold_last_month),
        averagePricePerSqft: this.parseNumber(response.avg_price_per_sqft),
        marketTrend: response.market_trend || 'stable',
        lastUpdated: response.last_updated || new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching market stats for ${location}:`, error);
      return null;
    }
  }

  private parseProperty(property: any): RedfinProperty {
    const rawUrl = property.url || '';
    const url = rawUrl && rawUrl.startsWith('/') ? `https://www.redfin.com${rawUrl}` : rawUrl;
    const photos: string[] = property.photos?.items && Array.isArray(property.photos.items)
      ? property.photos.items
      : this.parseImages(property.images || []);

    return {
      id: (property.listingId ?? property.propertyId ?? '').toString(),
      address: {
        streetAddress: this.rfVal(property.streetLine) || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: this.rfVal(property.postalCode) || property.zip || '',
      },
      propertyType: this.uiPropertyTypeName(this.parseNumber(property.uiPropertyType) || 0),
      price: this.parseNumber(this.rfVal(property.price)) || 0,
      pricePerSqft: this.parseNumber(this.rfVal(property.pricePerSqFt)),
      sqft: this.parseNumber(this.rfVal(property.sqFt)) || 0,
      bedrooms: this.parseNumber(property.beds) || 0,
      bathrooms: this.parseNumber(property.baths) || 0,
      yearBuilt: this.parseNumber(this.rfVal(property.yearBuilt)),
      lotSize: this.parseNumber(this.rfVal(property.lotSize)),
      images: photos,
      listingDate: new Date().toISOString(),
      daysOnMarket: this.parseNumber(this.rfVal(property.dom)),
      description: property.listingRemarks || '',
      url,
      mlsId: this.rfVal(property.mlsId) || '',
      status: property.mlsStatus || 'For Sale',
      priceHistory: [],
      marketStats: undefined,
    };
  }

  // Split a Redfin combined address ("9404 Meadow Vale, Austin, TX 78758").
  private parseFullAddress(full: string): { street: string; city: string; state: string; zip: string } {
    const parts = (full || '').split(',').map(p => p.trim()).filter(Boolean);
    const street = parts[0] || '';
    const city = parts.length >= 3 ? parts[1] : '';
    const last = parts[parts.length - 1] || '';
    const m = last.match(/([A-Z]{2})\s*(\d{5})?/);
    return { street, city, state: m?.[1] || '', zip: m?.[2] || '' };
  }

  // `data` is the `data` object from /property/detail — Redfin's page bundle.
  // We read the structured panels (aboveTheFold, mainHouseInfoPanelInfo,
  // publicRecordsInfo, mediaBrowserInfo, rental-estimate, propertyHistoryInfo).
  private parseDetailedProperty(data: any): RedfinProperty {
    const atf = data.aboveTheFold?.addressSectionInfo || {};
    const mh = data.mainHouseInfoPanelInfo?.mainHouseInfo || {};
    const init = data.initialInfo || {};
    const basic = data.belowTheFold?.publicRecordsInfo?.basicInfo || {};
    const mediaPhotos: any[] = data.aboveTheFold?.mediaBrowserInfo?.photos || [];
    const rentInfo = data['rental-estimate']?.rentalEstimateInfo;
    const historyEvents: any[] = data.belowTheFold?.propertyHistoryInfo?.events || [];

    const addr = this.parseFullAddress(mh.fullStreetAddress || '');

    const images = mediaPhotos
      .map(p => p?.photoUrls?.fullScreenPhotoUrl || p?.photoUrls?.nonFullScreenPhotoUrl)
      .filter((u: any): u is string => typeof u === 'string' && u.length > 0);
    if (images.length === 0 && atf.primaryPhotoUrl) images.push(atf.primaryPhotoUrl);

    const rawUrl = mh.url || '';
    const url = rawUrl && rawUrl.startsWith('/') ? `https://www.redfin.com${rawUrl}` : rawUrl;

    const price = this.parseNumber(atf.priceInfo?.amount ?? atf.latestPriceInfo?.amount) || 0;
    const sqft = this.parseNumber(this.rfVal(atf.sqFt) ?? basic.totalSqFt ?? basic.sqFtFinished) || 0;

    const priceHistory = historyEvents
      .filter(e => e?.price != null)
      .map(e => ({
        date: e.eventDate ? new Date(e.eventDate).toISOString() : '',
        price: this.parseNumber(e.price) || 0,
        event: e.eventDescription || e.mlsDescription || 'Price Change',
      }));

    return {
      id: (init.propertyId ?? mh.listingId ?? '').toString(),
      address: {
        streetAddress: addr.street,
        city: atf.city || addr.city,
        state: atf.state || addr.state,
        zipCode: addr.zip,
      },
      propertyType: basic.propertyTypeName
        || this.uiPropertyTypeName(this.parseNumber(atf.propertyType) || 0),
      price,
      pricePerSqft: this.parseNumber(atf.pricePerSqFt),
      sqft,
      bedrooms: this.parseNumber(atf.beds) || 0,
      bathrooms: this.parseNumber(atf.baths) || 0,
      yearBuilt: this.parseNumber(basic.yearBuilt),
      lotSize: this.parseNumber(atf.lotSize ?? basic.lotSqFt),
      images,
      listingDate: mh.lastUpdatedDate ? new Date(mh.lastUpdatedDate).toISOString() : new Date().toISOString(),
      daysOnMarket: undefined,
      description: mh.marketingRemarks?.[0]?.marketingRemark || '',
      url,
      mlsId: (init.mlsId || '').toString(),
      status: atf.status?.displayValue || atf.status?.definition || 'For Sale',
      priceHistory,
      marketStats: undefined,
      valueEstimate: this.parseNumber(atf.avmInfo?.predictedValue ?? data.avm?.predictedValue),
      rentEstimate: this.parseNumber(rentInfo?.predictedValue),
    };
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value.replace(/[,$]/g, '')) : Number(value);
    return isNaN(num) ? undefined : num;
  }

  private parseImages(images: any[]): string[] {
    if (!Array.isArray(images)) return [];
    return images
      .map(img => typeof img === 'string' ? img : img.url || img.src || img.image_url)
      .filter(url => url && typeof url === 'string');
  }

}

export const redfinApi = new RedfinApiService();