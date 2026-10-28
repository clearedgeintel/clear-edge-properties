import { searchResultZpid } from '@shared/search-ids';
import { zillowIntegration, ZillowSearchRequest } from './zillow';
import { loopNetApi, LoopNetSearchRequest } from './loopnet-api';
import { redfinApi, RedfinSearchRequest } from './redfin-api';
import { crexiApi, CrexiSearchRequest } from './crexi-api';
import { commercialPropertyScorer } from './commercial-property-scorer';
import { propertyScorer } from './property-scorer';
import { consoleLogger } from './console-logger';
import type { InsertProperty } from '@shared/schema';

export type PropertyPlatform = 'zillow' | 'loopnet' | 'redfin' | 'crexi';

export interface UnifiedSearchRequest {
  platform: PropertyPlatform;
  location: string;
  propertyType?: 'residential' | 'commercial' | 'mixed';
  priceMin?: number;
  priceMax?: number;
  bedsMin?: number;
  bedsMax?: number;
  bathsMin?: number;
  bathsMax?: number;
  sqftMin?: number;
  sqftMax?: number;
  homeType?: string;
  propertyTypes?: string[];
  maxResults?: number;
}

// Listing agent / broker contact surfaced on a result so an investor can reach
// out about the deal. Populated from whatever each platform exposes.
export interface AgentContact {
  name?: string;
  company?: string;
  phone?: string;
  photo?: string;
  profileUrl?: string;
}

export interface UnifiedProperty {
  id: string;
  platform: PropertyPlatform;
  agent?: AgentContact;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  };
  propertyType: string;
  price: number;
  sqft: number;
  images: string[];
  score: number;
  estimatedRoi: string;
  metrics: any;
  listingUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  
  // Residential specific
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  
  // Commercial specific
  capRate?: number;
  noi?: number;
  pricePerSqft?: number;
  parking?: number;
  units?: number;
  occupancy?: number;
  subtype?: string;
  investmentType?: string;
  isOpportunityZone?: boolean;
  hasOM?: boolean;
  unpriced?: boolean;
  listingSlug?: string;
}

export interface UnifiedSearchResult {
  platform: PropertyPlatform;
  totalFound: number;
  imported: number;
  errors: number;
  properties: UnifiedProperty[];
  errorMessages: string[];
  duplicates?: number;
  saveMessage?: string;
}

// Normalized shape for a single live external search result. The save endpoint
// accepts an array of these and maps each onto the NEW `properties` columns.
export type SearchResult = UnifiedProperty;

// zpid derivation is shared with the client (see shared/search-ids.ts).
export { searchResultZpid };

// Map a normalized live search result onto an InsertProperty row (NEW schema).
// Numeric columns are text in the DB, so numbers are stringified. Required NOT
// NULL columns are zpid + searchMarket.
export function toInsertProperty(result: SearchResult, searchMarket?: string): InsertProperty {
  const addr = result.address || ({} as SearchResult['address']);
  const fullAddress = [addr.streetAddress, addr.city, addr.state, addr.zipCode]
    .filter(Boolean)
    .join(', ');

  return {
    zpid: searchResultZpid(result),
    searchMarket: searchMarket || addr.city || addr.state || result.platform,
    address: addr.streetAddress || null,
    addressStreet: addr.streetAddress || null,
    addressCity: addr.city || null,
    addressState: addr.state || null,
    addressZip: addr.zipCode || null,
    fullAddress: fullAddress || null,
    homeType: result.propertyType || null,
    price: result.price != null ? result.price.toString() : null,
    listPrice: result.price != null ? result.price.toString() : null,
    sizeSqFt: result.sqft != null ? result.sqft.toString() : null,
    numBeds: result.bedrooms != null ? Math.round(result.bedrooms) : null,
    numBaths: result.bathrooms != null ? result.bathrooms.toString() : null,
    yearBuilt: result.yearBuilt != null ? Math.round(result.yearBuilt) : null,
    capRatePercent: result.capRate != null ? result.capRate.toString() : null,
    pricePerSqFt: result.pricePerSqft != null ? result.pricePerSqft.toString() : null,
    investmentScorePercent: result.score != null ? result.score.toString() : null,
    cashOnCashRoi:
      result.estimatedRoi != null && result.estimatedRoi !== '' ? result.estimatedRoi : null,
    imgMain: Array.isArray(result.images) && result.images.length > 0 ? result.images[0] : null,
    url: result.listingUrl || null,
    latitude: result.latitude != null ? result.latitude.toString() : null,
    longitude: result.longitude != null ? result.longitude.toString() : null,
  };
}

export class MultiPlatformSearchService {
  async searchProperties(request: UnifiedSearchRequest): Promise<UnifiedSearchResult> {
    try {
      switch (request.platform) {
        case 'zillow':
          return await this.searchZillow(request);
        case 'loopnet':
          return await this.searchLoopNet(request);
        case 'redfin':
          return await this.searchRedfin(request);
        case 'crexi':
          return await this.searchCrexi(request);
        default:
          throw new Error(`Unsupported platform: ${request.platform}`);
      }
    } catch (error) {
      console.error(`Search error for platform ${request.platform}:`, error);
      return {
        platform: request.platform,
        totalFound: 0,
        imported: 0,
        errors: 1,
        properties: [],
        errorMessages: [error instanceof Error ? error.message : 'Unknown search error'],
      };
    }
  }

  async searchAllPlatforms(request: Omit<UnifiedSearchRequest, 'platform'>): Promise<UnifiedSearchResult[]> {
    const platforms: PropertyPlatform[] = [];
    
    // Determine which platforms to search based on property type
    if (!request.propertyType || request.propertyType === 'residential' || request.propertyType === 'mixed') {
      platforms.push('zillow', 'redfin');
    }
    
    if (!request.propertyType || request.propertyType === 'commercial' || request.propertyType === 'mixed') {
      platforms.push('loopnet', 'crexi');
    }
    
    const searchPromises = platforms.map(platform => 
      this.searchProperties({ ...request, platform })
    );
    
    return Promise.all(searchPromises);
  }

  private async searchZillow(request: UnifiedSearchRequest): Promise<UnifiedSearchResult> {
    consoleLogger.logInfo(`Searching Zillow via multi-platform for location: ${request.location}`);
    const zillowRequest: ZillowSearchRequest = {
      location: request.location,
      priceMin: request.priceMin,
      priceMax: request.priceMax,
      bedsMin: request.bedsMin,
      bedsMax: request.bedsMax,
      bathsMin: request.bathsMin,
      bathsMax: request.bathsMax,
      sqftMin: request.sqftMin,
      sqftMax: request.sqftMax,
      homeType: request.homeType,
      maxResults: request.maxResults,
    };

    const result = await zillowIntegration.searchAndScoreProperties(zillowRequest);
    
    return {
      platform: 'zillow',
      totalFound: result.totalFound,
      imported: result.imported,
      errors: result.errors,
      properties: result.properties.map(this.convertZillowToUnified),
      errorMessages: result.errorMessages,
    };
  }

  private async searchLoopNet(request: UnifiedSearchRequest): Promise<UnifiedSearchResult> {
    consoleLogger.logInfo(`Searching LoopNet via multi-platform for location: ${request.location}`);
    const loopNetRequest: LoopNetSearchRequest = {
      location: request.location,
      propertyTypes: request.propertyTypes,
      priceMin: request.priceMin,
      priceMax: request.priceMax,
      sqftMin: request.sqftMin,
      sqftMax: request.sqftMax,
      maxResults: request.maxResults,
    };

    const properties = await loopNetApi.searchProperties(loopNetRequest);
    const scoredProperties = commercialPropertyScorer.scoreProperties(properties);
    
    return {
      platform: 'loopnet',
      totalFound: properties.length,
      imported: scoredProperties.length,
      errors: 0,
      properties: scoredProperties.map(this.convertLoopNetToUnified),
      errorMessages: [],
    };
  }

  private async searchRedfin(request: UnifiedSearchRequest): Promise<UnifiedSearchResult> {
    consoleLogger.logInfo(`Searching Redfin via multi-platform for location: ${request.location}`);
    const redfinRequest: RedfinSearchRequest = {
      location: request.location,
      priceMin: request.priceMin,
      priceMax: request.priceMax,
      bedsMin: request.bedsMin,
      bedsMax: request.bedsMax,
      bathsMin: request.bathsMin,
      bathsMax: request.bathsMax,
      sqftMin: request.sqftMin,
      sqftMax: request.sqftMax,
      homeType: request.homeType,
      maxResults: request.maxResults,
    };

    const properties = await redfinApi.searchProperties(redfinRequest);
    
    // Convert to unified format with basic scoring
    const unifiedProperties = properties.map(property => {
      const unified = this.convertRedfinToUnified(property);
      // Simple scoring based on price range and property features
      let score = 50; // Base score
      
      if (property.price < 300000) score += 20; // Affordable
      if (property.sqft > 1500) score += 10; // Good size
      if (property.yearBuilt && property.yearBuilt > 2000) score += 10; // Newer property
      if (property.bedrooms >= 3) score += 5; // Family-friendly
      if (property.bathrooms >= 2) score += 5; // Multiple bathrooms
      
      unified.score = Math.min(score, 100);
      unified.estimatedRoi = (score / 10).toFixed(2); // Simple ROI estimation
      
      return unified;
    });
    
    return {
      platform: 'redfin',
      totalFound: properties.length,
      imported: unifiedProperties.length,
      errors: 0,
      properties: unifiedProperties,
      errorMessages: [],
    };
  }

  private async searchCrexi(request: UnifiedSearchRequest): Promise<UnifiedSearchResult> {
    consoleLogger.logInfo(`Searching Crexi via multi-platform for location: ${request.location}`);
    const crexiRequest: CrexiSearchRequest = {
      location: request.location,
      priceMin: request.priceMin,
      priceMax: request.priceMax,
      maxResults: request.maxResults,
    };

    const properties = await crexiApi.searchProperties(crexiRequest);
    const scoredProperties = commercialPropertyScorer.scoreProperties(properties);

    return {
      platform: 'crexi',
      totalFound: properties.length,
      imported: scoredProperties.length,
      errors: 0,
      properties: scoredProperties.map(this.convertCrexiToUnified),
      errorMessages: [],
    };
  }

  private convertCrexiToUnified(property: any): UnifiedProperty {
    return {
      id: property.id || '',
      platform: 'crexi',
      address: {
        streetAddress: property.address?.streetAddress || '',
        city: property.address?.city || '',
        state: property.address?.state || '',
        zipCode: property.address?.zipCode || '',
      },
      propertyType: property.propertyType || 'Commercial',
      price: property.price || 0,
      sqft: property.sqft || 0,
      images: property.images || [],
      score: property.score || 0,
      estimatedRoi: property.estimatedRoi || '0.00',
      metrics: property.metrics || {},
      listingUrl: property.url,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      agent: property.broker,
      capRate: property.capRate,
      noi: property.noi,
      pricePerSqft: property.pricePerSqft,
      yearBuilt: property.yearBuilt,
      units: property.units,
      occupancy: property.occupancy,
      subtype: property.subtype,
      investmentType: property.investmentType,
      isOpportunityZone: property.isOpportunityZone,
      hasOM: property.hasOM,
      unpriced: property.unpriced,
      listingSlug: property.urlSlug,
    };
  }

  private convertZillowToUnified(property: any): UnifiedProperty {
    return {
      id: property.zpid || property.id || '',
      platform: 'zillow',
      address: {
        streetAddress: property.address?.streetAddress || property.address || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipcode || '',
      },
      propertyType: property.homeType || 'Single Family',
      price: property.price || 0,
      sqft: property.sizeSqFt || 0,
      images: property.images || [],
      score: property.score || 0,
      estimatedRoi: property.estimatedRoi || '0.00',
      metrics: property.metrics || {},
      listingUrl: property.url,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      agent: property.brokerName ? { company: property.brokerName } : undefined,
      bedrooms: property.numBeds,
      bathrooms: property.numBaths,
      yearBuilt: property.yearBuilt,
    };
  }

  private convertLoopNetToUnified(property: any): UnifiedProperty {
    return {
      id: property.id || '',
      platform: 'loopnet',
      address: {
        streetAddress: property.address?.streetAddress || '',
        city: property.address?.city || '',
        state: property.address?.state || '',
        zipCode: property.address?.zipCode || '',
      },
      propertyType: property.propertyType || 'Commercial',
      price: property.price || 0,
      sqft: property.sqft || 0,
      images: property.images || [],
      score: property.score || 0,
      estimatedRoi: property.estimatedRoi || '0.00',
      metrics: property.metrics || {},
      listingUrl: property.url,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      agent: property.broker,
      capRate: property.capRate,
      noi: property.noi,
      pricePerSqft: property.pricePerSqft,
      parking: property.parking,
      yearBuilt: property.yearBuilt,
      units: property.units,
      occupancy: property.occupancy,
      subtype: property.subtype,
      investmentType: property.investmentType,
      isOpportunityZone: property.isOpportunityZone,
      hasOM: property.hasOM,
      unpriced: property.unpriced,
      listingSlug: property.urlSlug,
    };
  }

  private convertRedfinToUnified(property: any): UnifiedProperty {
    return {
      id: property.id || '',
      platform: 'redfin',
      // RedfinProperty.address is already structured; older shapes were flat.
      address: {
        streetAddress: property.address?.streetAddress || (typeof property.address === 'string' ? property.address : ''),
        city: property.address?.city || property.city || '',
        state: property.address?.state || property.state || '',
        zipCode: property.address?.zipCode || property.zipcode || '',
      },
      propertyType: property.homeType || property.propertyType || 'Single Family',
      price: typeof property.price === 'string' ? parseInt(property.price.replace(/[,$]/g, '')) : property.price || 0,
      sqft: property.sizeSqFt || property.sqft || 0,
      images: property.images || [],
      score: property.score || 0,
      estimatedRoi: property.estimatedRoi || '0.00',
      metrics: property.metrics || {},
      listingUrl: property.url,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      yearBuilt: property.yearBuilt,
    };
  }

  getPlatformDisplayName(platform: PropertyPlatform): string {
    switch (platform) {
      case 'zillow': return 'Zillow';
      case 'loopnet': return 'LoopNet';
      case 'redfin': return 'Redfin';
      case 'crexi': return 'Crexi';
      default: return platform;
    }
  }

  getSupportedPropertyTypes(platform: PropertyPlatform): string[] {
    switch (platform) {
      case 'zillow':
        return ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'Land'];
      case 'loopnet':
        return ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use', 'Hotel', 'Land'];
      case 'redfin':
        return ['Single Family', 'Townhouse', 'Condo', 'Multi-Family'];
      case 'crexi':
        return ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Hospitality', 'Mixed Use'];
      default:
        return [];
    }
  }
}

export const multiPlatformSearch = new MultiPlatformSearchService();