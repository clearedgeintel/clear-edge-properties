import fetch from 'node-fetch';
import { propertyScorer, PropertyData, ScoredProperty } from './property-scorer';
import { consoleLogger } from './console-logger';

// ─── Zillow API Configuration ────────────────────────────────────────────────

// The subscribed RapidAPI product is "US Housing Market Data" (Zillow-sourced).
// It serves the same /propertyExtendedSearch + /property + /rentEstimate endpoints
// the legacy zillow-com1 host did, but expects camelCase price/bed/bath/sqft
// filters. The key is NOT subscribed to zillow-com1 (returns 404).
const RAPIDAPI_HOST = 'us-housing-market-data1.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Parse a Zillow-style combined address string ("123 Main St, Austin, TX 78701")
// into its parts. /propertyExtendedSearch returns address as a single string.
function parseAddress(full: string): { street: string; city: string; state: string; zipcode: string } {
  const parts = (full || '').split(',').map(p => p.trim()).filter(Boolean);
  const street = parts[0] || '';
  const city = parts.length >= 3 ? parts[1] : (parts.length === 2 ? parts[1] : '');
  const last = parts[parts.length - 1] || '';
  const m = last.match(/([A-Z]{2})\s*(\d{5})?/);
  const state = m?.[1] || '';
  const zipcode = m?.[2] || '';
  return { street, city: parts.length >= 3 ? city : city.replace(/\s+[A-Z]{2}\s*\d{5}.*$/, '').trim(), state, zipcode };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ZillowProperty {
  zpid: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  homeType: string;
  yearBuilt: number;
  lotSize: number;
  propertyTaxRate: number;
  zestimate: number;
  rentEstimate: number;
  daysOnZillow: number;
  isForeclosure: boolean;
  isNewConstruction: boolean;
  listingStatus: string;
  images: string[];
  url: string;
  brokerName: string;
  latitude: number | null;
  longitude: number | null;
}

/** Finite number or null; search payloads mix numbers, strings and blanks. */
function coord(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

interface ZillowSearchParams {
  location: string;
  home_type?: string;
  price_min?: number;
  price_max?: number;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  lot_size_min?: number;
  lot_size_max?: number;
  built_year_min?: number;
  built_year_max?: number;
  page?: number;
  status_type?: 'ForSale' | 'ForRent' | 'Sold' | 'RecentlySold';
  sort?: 'Price_High_Low' | 'Price_Low_High' | 'Newest' | 'Bedrooms' | 'Bathrooms' | 'Square_Feet' | 'Lot_Size';
}

export interface ZillowSearchRequest {
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

export interface ZillowImportResult {
  totalFound: number;
  imported: number;
  errors: number;
  properties: ScoredProperty[];
  errorMessages: string[];
}

export interface ZillowPhotos {
  photos: string[];
  photoCount: number;
}

// ─── Rich property enrichment (on-demand /property detail) ───────────────────

export interface PropertyAgent {
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  photo: string | null;
  profileUrl: string | null;
  zuid: string | null;
  rating: number | null;
  reviewCount: number | null;
  licenseNumber: string | null;
}

export interface ZillowPropertyDetail {
  zpid: string;
  url: string;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
    subdivision: string | null;
    neighborhood: string | null;
  };
  homeType: string | null;
  homeStatus: string | null;
  price: number | null;
  priceChange: number | null;
  zestimate: number | null;
  rentZestimate: number | null;
  estimatedSalesRange: { low: number; high: number } | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  stories: number | null;
  pricePerSqft: number | null;
  hoaFeeMonthly: number | null;
  taxAssessedValue: number | null;
  annualTax: number | null;
  propertyTaxRate: number | null;
  daysOnZillow: number | null;
  description: string | null;
  virtualTour: string | null;
  mlsId: string | null;
  mlsName: string | null;
  images: string[];
  latitude: number | null;
  longitude: number | null;
  agent: PropertyAgent | null;
  features: {
    heating: string[];
    cooling: string[];
    appliances: string[];
    flooring: string[];
    parking: number | null;
    hasGarage: boolean | null;
    architecturalStyle: string | null;
    constructionMaterials: string[];
  };
  schools: Array<{ name: string; rating: number | null; level: string | null; grades: string | null; distance: number | null; link: string | null }>;
  priceHistory: Array<{ date: string; price: number | null; event: string; pricePerSqft: number | null }>;
  taxHistory: Array<{ year: number | null; taxPaid: number | null; value: number | null }>;
  climateRisks: Array<{ type: string; label: string; value: number | null }>;
}

// ─── API Service ─────────────────────────────────────────────────────────────

export class ZillowApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY is required for Zillow API integration');
    }
    this.apiKey = RAPIDAPI_KEY;
    this.baseUrl = `https://${RAPIDAPI_HOST}`;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      throw new Error(`Zillow API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  }

  async searchProperties(params: ZillowSearchParams): Promise<ZillowProperty[]> {
    try {
      // us-housing-market-data1 expects camelCase price/bed/bath/sqft filters.
      const response = await this.makeRequest('/propertyExtendedSearch', {
        location: params.location,
        home_type: params.home_type || 'Houses',
        minPrice: params.price_min,
        maxPrice: params.price_max,
        bedsMin: params.beds_min,
        bedsMax: params.beds_max,
        bathsMin: params.baths_min,
        bathsMax: params.baths_max,
        sqftMin: params.sqft_min,
        sqftMax: params.sqft_max,
        buildYearMin: params.built_year_min,
        buildYearMax: params.built_year_max,
        page: params.page || 1,
        status_type: params.status_type || 'ForSale',
        sort: params.sort || 'Price_Low_High'
      });

      return this.normalizeProperties(response.props || []);
    } catch (error) {
      console.error('Error searching Zillow properties:', error);
      throw error;
    }
  }

  async getPropertyDetails(zpid: string): Promise<ZillowProperty | null> {
    try {
      const response = await this.makeRequest('/property', { zpid });
      return this.normalizeProperty(response);
    } catch (error) {
      console.error('Error fetching property details:', error);
      return null;
    }
  }

  async getPropertyPhotos(zpid: string): Promise<string[]> {
    try {
      const response = await this.makeRequest('/images', { zpid });
      return response.images || [];
    } catch (error) {
      console.error('Error fetching property photos:', error);
      return [];
    }
  }

  async getRentEstimate(zpid: string): Promise<number | null> {
    try {
      const response = await this.makeRequest('/rentEstimate', { zpid });
      return response.rent || null;
    } catch (error) {
      console.error('Error fetching rent estimate:', error);
      return null;
    }
  }

  async getComparables(zpid: string): Promise<ZillowProperty[]> {
    try {
      const response = await this.makeRequest('/similarSales', { zpid });
      return this.normalizeProperties(response.comps || []);
    } catch (error) {
      console.error('Error fetching comparables:', error);
      return [];
    }
  }

  async getMarketTrends(location: string): Promise<any> {
    try {
      const response = await this.makeRequest('/marketTrends', { location });
      return response;
    } catch (error) {
      console.error('Error fetching market trends:', error);
      return null;
    }
  }

  // On-demand full enrichment for a single property. Accepts a zpid or a listing
  // url/path. Captures the listing agent (listed_by → attributionInfo) plus the
  // rich detail the lightweight search payload omits (zestimate, rent, history,
  // tax, schools, climate risk, resoFacts). Returns null on miss.
  async getPropertyEnrichment(idOrUrl: string): Promise<ZillowPropertyDetail | null> {
    try {
      const looksLikeUrl = /^https?:\/\//i.test(idOrUrl) || idOrUrl.includes('/homedetails/');
      const params = looksLikeUrl
        ? { property_url: idOrUrl.startsWith('http') ? idOrUrl : `https://www.zillow.com${idOrUrl}` }
        : { zpid: idOrUrl };

      const data = await this.makeRequest('/property', params);
      if (!data || data.status === 'error' || !data.zpid) return null;
      return this.normalizeDetail(data);
    } catch (error) {
      console.error('Error fetching property enrichment:', error);
      return null;
    }
  }

  private normalizeDetail(data: any): ZillowPropertyDetail {
    const reso = data.resoFacts || {};
    const attr = data.attributionInfo || {};
    const lb = data.listed_by || null;

    // Prefer the full agent name from attributionInfo; keep the precise zuid /
    // photo / rating from the listed_by card.
    const phone = lb?.phone;
    const lbPhone = phone?.areacode
      ? `(${phone.areacode}) ${phone.prefix ?? ''}-${phone.number ?? ''}`.replace(/-\s*$/, '')
      : null;
    const agentName = attr.agentName || lb?.display_name || null;
    const agent: PropertyAgent | null = agentName || lb
      ? {
          name: agentName,
          company: lb?.business_name || attr.brokerName || data.brokerageName || null,
          phone: attr.agentPhoneNumber || lbPhone || attr.brokerPhoneNumber || null,
          email: attr.agentEmail || null,
          photo: lb?.image_url || null,
          profileUrl: lb?.profile_url || null,
          zuid: lb?.zuid || null,
          rating: this.numOrNull(lb?.rating_average),
          reviewCount: this.numOrNull(lb?.review_count),
          licenseNumber: attr.agentLicenseNumber || null,
        }
      : null;

    const range = Array.isArray(data.estimatedSalesRange) && data.estimatedSalesRange.length === 2
      ? { low: data.estimatedSalesRange[0], high: data.estimatedSalesRange[1] }
      : null;

    const climate = data.climate || {};
    const climateRisks = ([
      ['Flood', climate.floodSources],
      ['Fire', climate.fireSources],
      ['Wind', climate.windSources],
      ['Heat', climate.heatSources],
      ['Air', climate.airSources],
    ] as const)
      .map(([type, src]: any) => {
        const score = src?.primary?.riskScore;
        return score?.label ? { type, label: score.label, value: this.numOrNull(score.value) } : null;
      })
      .filter(Boolean) as ZillowPropertyDetail['climateRisks'];

    const url = data.url && data.url.startsWith('/') ? `https://www.zillow.com${data.url}` : (data.url || '');

    return {
      zpid: data.zpid?.toString() || '',
      url,
      address: {
        streetAddress: data.address?.streetAddress || data.streetAddress || '',
        city: data.address?.city || data.city || '',
        state: data.address?.state || data.state || '',
        zipcode: data.address?.zipcode || data.zipcode || '',
        subdivision: data.address?.subdivision || reso.subdivisionName || null,
        neighborhood: data.address?.neighborhood || data.neighborhoodRegion?.name || null,
      },
      homeType: data.homeType || null,
      homeStatus: data.homeStatus || null,
      price: this.numOrNull(data.price),
      priceChange: this.numOrNull(data.priceChange),
      zestimate: this.numOrNull(data.zestimate),
      rentZestimate: this.numOrNull(data.rentZestimate),
      estimatedSalesRange: range,
      bedrooms: this.numOrNull(data.bedrooms),
      bathrooms: this.numOrNull(data.bathrooms),
      livingArea: this.numOrNull(data.livingArea ?? data.livingAreaValue),
      lotSize: this.numOrNull(reso.lotSize),
      yearBuilt: this.numOrNull(data.yearBuilt ?? reso.yearBuilt),
      stories: this.numOrNull(reso.stories),
      pricePerSqft: this.numOrNull(reso.pricePerSquareFoot),
      hoaFeeMonthly: this.numOrNull(data.monthlyHoaFee),
      taxAssessedValue: this.numOrNull(reso.taxAssessedValue),
      annualTax: this.numOrNull(reso.taxAnnualAmount),
      propertyTaxRate: this.numOrNull(data.propertyTaxRate),
      daysOnZillow: this.numOrNull(reso.daysOnZillow),
      description: data.description || null,
      virtualTour: data.virtualTour || reso.virtualTour || null,
      mlsId: data.mlsid || attr.mlsId || null,
      mlsName: attr.mlsName || null,
      images: data.imgSrc ? [data.imgSrc] : [],
      latitude: this.numOrNull(data.latitude),
      longitude: this.numOrNull(data.longitude),
      agent,
      features: {
        heating: Array.isArray(reso.heating) ? reso.heating : [],
        cooling: Array.isArray(reso.cooling) ? reso.cooling : [],
        appliances: Array.isArray(reso.appliances) ? reso.appliances : [],
        flooring: Array.isArray(reso.flooring) ? reso.flooring : [],
        parking: this.numOrNull(reso.parkingCapacity ?? reso.garageParkingCapacity),
        hasGarage: typeof reso.hasGarage === 'boolean' ? reso.hasGarage : null,
        architecturalStyle: reso.architecturalStyle || null,
        constructionMaterials: Array.isArray(reso.constructionMaterials) ? reso.constructionMaterials : [],
      },
      schools: Array.isArray(data.schools)
        ? data.schools.map((s: any) => ({
            name: s.name || '',
            rating: this.numOrNull(s.rating),
            level: s.level || null,
            grades: s.grades || null,
            distance: this.numOrNull(s.distance),
            link: s.link || null,
          }))
        : [],
      priceHistory: Array.isArray(data.priceHistory)
        ? data.priceHistory.map((p: any) => ({
            date: p.date || '',
            price: this.numOrNull(p.price),
            event: p.event || '',
            pricePerSqft: this.numOrNull(p.pricePerSquareFoot),
          }))
        : [],
      taxHistory: Array.isArray(data.taxHistory)
        ? data.taxHistory.map((t: any) => ({
            year: t.time ? new Date(t.time).getFullYear() : null,
            taxPaid: this.numOrNull(t.taxPaid),
            value: this.numOrNull(t.value),
          }))
        : [],
      climateRisks,
    };
  }

  private numOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value);
    return isNaN(n) ? null : n;
  }

  private normalizeProperty(data: any): ZillowProperty {
    // /propertyExtendedSearch returns `address` as one combined string and a
    // single `imgSrc`; /property returns richer structured fields. Handle both.
    let street = '';
    let city = data.city || '';
    let state = data.state || '';
    let zipcode = data.zipcode || data.zipCode || '';
    if (typeof data.address === 'string') {
      const parsed = parseAddress(data.address);
      street = parsed.street;
      city = city || parsed.city;
      state = state || parsed.state;
      zipcode = zipcode || parsed.zipcode;
    } else if (data.address && typeof data.address === 'object') {
      street = data.address.streetAddress || '';
      city = city || data.address.city || '';
      state = state || data.address.state || '';
      zipcode = zipcode || data.address.zipcode || '';
    } else {
      street = data.streetAddress || '';
    }

    const images = Array.isArray(data.images)
      ? data.images
      : (data.imgSrc ? [data.imgSrc] : []);

    const rawUrl = data.url || data.detailUrl || '';
    const url = rawUrl && rawUrl.startsWith('/') ? `https://www.zillow.com${rawUrl}` : rawUrl;

    return {
      zpid: data.zpid?.toString() || '',
      address: street,
      city,
      state,
      zipcode,
      price: this.parseNumber(data.price),
      bedrooms: this.parseNumber(data.bedrooms),
      bathrooms: this.parseNumber(data.bathrooms),
      livingArea: this.parseNumber(data.livingArea || data.sqft || data.size),
      homeType: data.homeType || data.propertyType || 'Unknown',
      yearBuilt: this.parseNumber(data.yearBuilt),
      lotSize: this.parseNumber(data.lotSize || data.lotAreaValue),
      propertyTaxRate: this.parseNumber(data.propertyTaxRate) || 1.25,
      zestimate: this.parseNumber(data.zestimate),
      rentEstimate: this.parseNumber(data.rentEstimate || data.rentZestimate),
      daysOnZillow: this.parseNumber(data.daysOnZillow),
      isForeclosure: Boolean(data.isForeclosure),
      isNewConstruction: Boolean(data.isNewConstruction),
      listingStatus: data.listingStatus || 'ForSale',
      images,
      url,
      brokerName: data.brokerName || '',
      latitude: coord(data.latitude ?? data.latLong?.latitude),
      longitude: coord(data.longitude ?? data.latLong?.longitude),
    };
  }

  private normalizeProperties(properties: any[]): ZillowProperty[] {
    return properties.map(prop => this.normalizeProperty(prop));
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

export const zillowApi = new ZillowApiService();

// ─── Integration Service ─────────────────────────────────────────────────────

export class ZillowIntegrationService {

  private convertZillowToPropertyData(zillowProperty: any): PropertyData {
    return {
      address: zillowProperty.address || '',
      city: zillowProperty.city || '',
      state: zillowProperty.state || '',
      zipcode: zillowProperty.zipcode || '',
      homeType: zillowProperty.homeType || 'SINGLE_FAMILY',
      price: zillowProperty.price || 0,
      rentEstimate: zillowProperty.rentEstimate || 0,
      zestimate: zillowProperty.zestimate || 0,
      taxAssessedValue: zillowProperty.taxAssessedValue || 0,
      sizeSqFt: zillowProperty.livingArea || 0,
      zpid: zillowProperty.zpid || '',
      numBeds: zillowProperty.bedrooms || 0,
      numBaths: zillowProperty.bathrooms || 0,
      yearBuilt: zillowProperty.yearBuilt || null,
      url: zillowProperty.url || '',
      listingStatus: zillowProperty.listingStatus || 'ForSale',
      daysOnZillow: zillowProperty.daysOnZillow || 0,
      isForeclosure: zillowProperty.isForeclosure || false,
      isNewConstruction: zillowProperty.isNewConstruction || false,
      images: Array.isArray(zillowProperty.images) ? zillowProperty.images : [],
      brokerName: zillowProperty.brokerName || '',
      latitude: zillowProperty.latitude ?? null,
      longitude: zillowProperty.longitude ?? null,
    };
  }

  private mapPropertyType(homeType: string): string {
    const typeMap: { [key: string]: string } = {
      'SingleFamily': 'SINGLE_FAMILY',
      'Condo': 'CONDO',
      'Townhouse': 'TOWNHOUSE',
      'MultiFamily': 'MULTI_FAMILY',
      'Apartment': 'APARTMENT',
      'Manufactured': 'MANUFACTURED',
      'Lot': 'LOT'
    };
    return typeMap[homeType] || 'SINGLE_FAMILY';
  }

  async searchAndScoreProperties(searchParams: ZillowSearchRequest): Promise<ZillowImportResult> {
    const result: ZillowImportResult = {
      totalFound: 0,
      imported: 0,
      errors: 0,
      properties: [],
      errorMessages: []
    };

    try {
      consoleLogger.logRequest('GET', '/zillow/search', { location: searchParams.location });
      consoleLogger.logInfo(`Searching Zillow for properties in ${searchParams.location}`);

      const zillowProperties = await zillowApi.searchProperties({
        location: searchParams.location,
        price_min: searchParams.priceMin,
        price_max: searchParams.priceMax,
        beds_min: searchParams.bedsMin,
        beds_max: searchParams.bedsMax,
        baths_min: searchParams.bathsMin,
        baths_max: searchParams.bathsMax,
        sqft_min: searchParams.sqftMin,
        sqft_max: searchParams.sqftMax,
        home_type: searchParams.homeType || 'Houses',
        status_type: 'ForSale'
      });

      result.totalFound = zillowProperties.length;
      consoleLogger.logInfo(`Found ${zillowProperties.length} properties on Zillow`);

      const propertiesToProcess = searchParams.maxResults
        ? zillowProperties.slice(0, searchParams.maxResults)
        : zillowProperties;

      // The search payload already includes price, beds/baths, livingArea,
      // zestimate and rentZestimate, so we score directly off it rather than
      // making an extra /property + /rentEstimate call per result (N+1 → burns
      // quota). Per-property enrichment remains available via getPropertyDetails
      // for the property-detail route.
      for (const zillowProperty of propertiesToProcess) {
        try {
          const propertyData = this.convertZillowToPropertyData(zillowProperty);
          const scoredProperty = propertyScorer.scoreProperty(propertyData);

          result.properties.push(scoredProperty);
          result.imported++;

        } catch (error: any) {
          result.errors++;
          result.errorMessages.push(`Error processing property ${zillowProperty.address}: ${error.message}`);
          console.error('Error processing property:', error);
        }
      }

    } catch (error: any) {
      result.errors++;
      result.errorMessages.push(`Search error: ${error.message}`);
      console.error('Zillow search error:', error);
      consoleLogger.logError(error, 'Zillow search');
    }

    const addresses = result.properties.map((p: any) => {
      if (typeof p.address === 'string') return p.address;
      if (p.streetAddress) return p.streetAddress;
      if (p.fullAddress) return p.fullAddress;
      if (p.location?.address) return p.location.address;

      if (p.address && typeof p.address === 'object') {
        const parts = [
          p.address.streetAddress || p.address.street || p.address.line1,
          p.address.city,
          p.address.state || p.address.stateCode,
          p.address.zipcode || p.address.zip || p.address.postalCode
        ].filter(Boolean);

        if (parts.length > 0) return parts.join(', ');
      }

      const parts = [p.street, p.city, p.state, p.zipCode].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');

      return `Property ${p.zpid || p.id || 'Unknown'}`;
    }).filter((addr: string) => addr && addr.length > 0 && addr !== '[object Object]');

    if (addresses.length > 0) {
      const addressList = addresses.slice(0, 5).join(', ');
      const remaining = addresses.length > 5 ? ` and ${addresses.length - 5} more` : '';
      consoleLogger.logInfo(`Found properties: ${addressList}${remaining}`);
    }

    consoleLogger.logResponse(200, {
      totalFound: result.totalFound,
      imported: result.imported,
      errors: result.errors
    }, 'zillow');

    consoleLogger.logInfo(`Search completed: ${result.imported} properties processed, ${result.errors} errors`);

    return result;
  }

  async getZillowPropertyDetails(zpid: string): Promise<ScoredProperty | null> {
    try {
      const zillowProperty = await zillowApi.getPropertyDetails(zpid);
      if (!zillowProperty) return null;

      const rentEstimate = await zillowApi.getRentEstimate(zpid);
      if (rentEstimate) {
        zillowProperty.rentEstimate = rentEstimate;
      }

      const propertyData = this.convertZillowToPropertyData(zillowProperty);
      return propertyScorer.scoreProperty(propertyData);

    } catch (error) {
      console.error('Error fetching Zillow property details:', error);
      return null;
    }
  }

  async getMarketAnalysis(location: string) {
    try {
      const marketTrends = await zillowApi.getMarketTrends(location);

      const sampleProperties = await this.searchAndScoreProperties({
        location,
        maxResults: 20
      });

      const prices = sampleProperties.properties.map(p => p.price).filter(p => p > 0);
      const scores = sampleProperties.properties.map(p => p.score);
      const rois = sampleProperties.properties.map(p => parseFloat(p.estimatedRoi)).filter(r => !isNaN(r));

      return {
        location,
        marketTrends,
        sampleSize: sampleProperties.properties.length,
        priceStats: {
          median: this.calculateMedian(prices),
          average: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
          min: Math.min(...prices),
          max: Math.max(...prices)
        },
        scoreStats: {
          median: this.calculateMedian(scores),
          average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
          min: Math.min(...scores),
          max: Math.max(...scores)
        },
        roiStats: {
          median: this.calculateMedian(rois),
          average: rois.length > 0 ? rois.reduce((a, b) => a + b, 0) / rois.length : 0,
          min: Math.min(...rois),
          max: Math.max(...rois)
        }
      };
    } catch (error) {
      console.error('Error getting market analysis:', error);
      throw error;
    }
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

export const zillowIntegration = new ZillowIntegrationService();

// ─── Photo Fetching ──────────────────────────────────────────────────────────

export async function fetchZillowPhotos(zillowId: string): Promise<ZillowPhotos> {
  if (!zillowId || zillowId.trim() === '') {
    return { photos: [], photoCount: 0 };
  }

  try {
    const photos = await tryZillowPublicAPI(zillowId);
    if (photos.length > 0) {
      return { photos, photoCount: photos.length };
    }

    const mobilePhotos = await tryZillowMobileAPI(zillowId);
    if (mobilePhotos.length > 0) {
      return { photos: mobilePhotos, photoCount: mobilePhotos.length };
    }

    const webPhotos = await tryZillowWebScraping(zillowId);
    if (webPhotos.length > 0) {
      return { photos: webPhotos, photoCount: webPhotos.length };
    }

    console.warn(`No photos found for Zillow ID: ${zillowId}`);
    return { photos: [], photoCount: 0 };

  } catch (error) {
    console.error(`Error fetching Zillow photos for ID ${zillowId}:`, error);
    return { photos: [], photoCount: 0 };
  }
}

async function tryZillowPublicAPI(zillowId: string): Promise<string[]> {
  try {
    const apiUrl = `https://www.zillow.com/api/v1/property/${zillowId}/photos`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': `https://www.zillow.com/homedetails/${zillowId}_zpid/`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      if (data?.photos && Array.isArray(data.photos)) {
        return data.photos.map((photo: any) => photo.url || photo.src).filter(Boolean);
      }
    }
  } catch (error) {
    console.debug('Zillow public API failed:', error);
  }

  return [];
}

async function tryZillowMobileAPI(zillowId: string): Promise<string[]> {
  try {
    const mobileUrl = `https://www.zillow.com/api/v1/mobile/property/${zillowId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(mobileUrl, {
      headers: {
        'User-Agent': 'ZillowApp/14.0 (iPhone; iOS 15.0; Scale/3.00)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      if (data?.property?.photos && Array.isArray(data.property.photos)) {
        return data.property.photos.map((photo: any) => photo.url || photo.src).filter(Boolean);
      }
    }
  } catch (error) {
    console.debug('Zillow mobile API failed:', error);
  }

  return [];
}

async function tryZillowWebScraping(zillowId: string): Promise<string[]> {
  try {
    const propertyUrl = `https://www.zillow.com/homedetails/${zillowId}_zpid/`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(propertyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();

      const jsonDataMatch = html.match(/"photos":\s*(\[.*?\])/);
      if (jsonDataMatch) {
        try {
          const photos = JSON.parse(jsonDataMatch[1]);
          if (Array.isArray(photos)) {
            return photos.map((photo: any) => photo.url || photo.src).filter(Boolean);
          }
        } catch (parseError) {
          console.debug('Failed to parse photos JSON:', parseError);
        }
      }

      const scriptMatches = html.match(/<script[^>]*>[\s\S]*?window\.APP_STATE\s*=\s*(\{[\s\S]*?\});[\s\S]*?<\/script>/);
      if (scriptMatches) {
        try {
          const appState = JSON.parse(scriptMatches[1]);
          const photos = extractPhotosFromAppState(appState);
          if (photos.length > 0) {
            return photos;
          }
        } catch (parseError) {
          console.debug('Failed to parse APP_STATE:', parseError);
        }
      }

      const imgMatches = html.match(/https:\/\/photos\.zillowstatic\.com\/[^"'\s]+\.jpg/g);
      if (imgMatches) {
        const uniquePhotos = Array.from(new Set(imgMatches))
          .filter(url => !url.includes('thumbnail'))
          .slice(0, 20);

        if (uniquePhotos.length > 0) {
          return uniquePhotos;
        }
      }
    }
  } catch (error) {
    console.debug('Zillow web scraping failed:', error);
  }

  return [];
}

function extractPhotosFromAppState(appState: any): string[] {
  try {
    const propertyData = appState?.property || appState?.propertyDetails || appState?.data?.property;

    if (propertyData?.photos && Array.isArray(propertyData.photos)) {
      return propertyData.photos.map((photo: any) => photo.url || photo.src).filter(Boolean);
    }

    const alternativePaths = [
      appState?.photos,
      appState?.propertyImages,
      appState?.data?.photos,
      appState?.listing?.photos,
    ];

    for (const path of alternativePaths) {
      if (path && Array.isArray(path)) {
        const photos = path.map((photo: any) => photo.url || photo.src || photo).filter(Boolean);
        if (photos.length > 0) {
          return photos;
        }
      }
    }
  } catch (error) {
    console.debug('Error extracting photos from APP_STATE:', error);
  }

  return [];
}

export function upgradePhotoQuality(photoUrls: string[]): string[] {
  return photoUrls.map(url => {
    if (url.includes('photos.zillowstatic.com')) {
      return url
        .replace(/\/p_[a-z]/g, '/p_f')
        .replace(/\/cc_ft_\d+/g, '/cc_ft_1536')
        .replace(/\/h_\d+/g, '/h_1024')
        .replace(/\/w_\d+/g, '/w_1536');
    }
    return url;
  });
}

export function validatePhotoUrls(urls: string[]): string[] {
  return urls
    .filter(url => {
      try {
        new URL(url);
        return url.match(/\.(jpg|jpeg|png|webp)$/i);
      } catch {
        return false;
      }
    })
    .slice(0, 15);
}

export async function batchFetchZillowPhotos(zillowIds: string[]): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  const batchSize = 5;

  for (let i = 0; i < zillowIds.length; i += batchSize) {
    const batch = zillowIds.slice(i, i + batchSize);
    const promises = batch.map(async (id) => {
      const photos = await fetchZillowPhotos(id);
      return { id, photos: photos.photos };
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ id, photos }) => {
      results.set(id, validatePhotoUrls(upgradePhotoQuality(photos)));
    });

    if (i + batchSize < zillowIds.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}
