import fetch from 'node-fetch';

// ─── Agent intelligence API ──────────────────────────────────────────────────
// Wraps the "US Housing Market Data" agent endpoints (Zillow-sourced) so an
// investor can look up a listing agent and gauge whether they're worth a
// relationship: find by name/location, then their active + sold listings and
// reviews keyed by the agent's `zuid`.

const RAPIDAPI_HOST = 'us-housing-market-data1.p.rapidapi.com';

export interface AgentSummary {
  zuid: string;
  username: string | null;
  name: string;
  brokerage: string | null;
  location: string | null;
  phone: string | null;
  photo: string | null;
  profileUrl: string | null;
  reviewCount: number;
  rating: number;
}

export interface AgentListing {
  zpid: string;
  address: string;
  city: string;
  state: string;
  beds: number | null;
  baths: number | null;
  price: number | null;
  photo: string | null;
  status: string | null;
  propertyType: string | null;
  brokerage: string | null;
  url: string | null;
  soldDate: string | null;
}

export interface AgentReview {
  id: string;
  rating: number;
  comment: string;
  date: string;
  reviewer: string | null;
  workDescription: string | null;
  subRatings: Array<{ description: string; score: number }>;
}

export interface AgentProfile {
  zuid: string;
  activeListings: AgentListing[];
  activeCount: number;
  soldListings: AgentListing[];
  soldCount: number;
  reviews: AgentReview[];
  reviewCount: number;
  avgRating: number;
}

const PLACEHOLDER_PHOTO = /nophoto/i;

export class AgentApiService {
  private readonly baseUrl = `https://${RAPIDAPI_HOST}`;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    if (!this.apiKey) {
      throw new Error('RAPIDAPI_KEY environment variable is required for Agent API');
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
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'X-RapidAPI-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Agent API error: ${response.status} - ${response.statusText}`);
    }
    return await response.json();
  }

  async searchAgents(name: string, location?: string, page = 1): Promise<AgentSummary[]> {
    const response = await this.makeRequest('/findAgentV2', { name, location, page });
    const pros: any[] = response?.professionals || [];
    return pros
      .filter(p => p.encodedZuid)
      .map((p): AgentSummary => {
        const profileLink: string = p.profileLink || '';
        const username = profileLink.startsWith('/profile/')
          ? profileLink.slice('/profile/'.length)
          : null;
        const photo = p.profilePhotoSrc && !PLACEHOLDER_PHOTO.test(p.profilePhotoSrc)
          ? p.profilePhotoSrc
          : null;
        return {
          zuid: p.encodedZuid,
          username,
          name: p.fullName || 'Unknown agent',
          brokerage: p.businessName || null,
          location: p.location || null,
          phone: p.phoneNumber || null,
          photo,
          profileUrl: profileLink ? `https://www.zillow.com${profileLink}` : null,
          reviewCount: this.num(p.numTotalReviews) ?? 0,
          rating: this.num(p.reviewStarsRating) ?? 0,
        };
      });
  }

  async getAgentProfile(zuid: string): Promise<AgentProfile> {
    // The listing endpoints require size >= 5. Fetch the three panels in
    // parallel; tolerate any one failing (a new agent may have no sold history).
    const [active, sold, reviews] = await Promise.all([
      this.makeRequest('/agentActiveListings', { zuid, size: 5, page: 1 }).catch(() => null),
      this.makeRequest('/agentSoldListings', { zuid, size: 5, page: 1 }).catch(() => null),
      this.makeRequest('/agentReviews', { zuid, page: 1 }).catch(() => null),
    ]);

    const activeListings = (active?.listings || []).map((l: any) => this.normalizeListing(l));
    const soldListings = (sold?.listings || []).map((l: any) => this.normalizeListing(l));
    const reviewList: AgentReview[] = (reviews?.reviews || []).map((r: any): AgentReview => ({
      id: (r.reviewId ?? '').toString(),
      rating: this.num(r.rating) ?? 0,
      comment: r.reviewComment || '',
      date: r.createDate || '',
      reviewer: this.reviewerName(r.reviewer),
      workDescription: r.workDescription || null,
      subRatings: Array.isArray(r.subRatings)
        ? r.subRatings.map((s: any) => ({ description: s.description, score: this.num(s.score) ?? 0 }))
        : [],
    }));

    const ratings = reviewList.map(r => r.rating).filter(n => n > 0);
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

    return {
      zuid,
      activeListings,
      activeCount: this.num(active?.listing_count) ?? activeListings.length,
      soldListings,
      soldCount: this.num(sold?.listing_count) ?? soldListings.length,
      reviews: reviewList,
      reviewCount: this.num(reviews?.totalCount) ?? reviewList.length,
      avgRating,
    };
  }

  // Active and sold listings come back in different shapes. Active has a
  // structured `address` object + `primary_photo_url` + `listing_url`; sold has
  // the address in `image_alt`, a street-view `image_url`, `home_details_url`,
  // a `sold_date`, and often a hidden price ("--"). Handle both.
  private normalizeListing(l: any): AgentListing {
    const addr = l.address || {};
    const altParts: string[] = (l.image_alt || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const rawUrl = l.listing_url || l.home_details_url || '';
    return {
      zpid: (l.zpid ?? '').toString(),
      address: addr.line1 || altParts[0] || '',
      city: addr.city || altParts[1] || '',
      state: addr.stateOrProvince || altParts[2] || '',
      beds: this.num(l.bedrooms),
      baths: this.num(l.bathrooms),
      price: this.num(l.price),
      photo: l.primary_photo_url || l.medium_image_url || l.image_url || null,
      status: l.home_marketing_status || l.status || (l.sold_date ? 'sold' : null),
      propertyType: l.home_type || null,
      brokerage: l.brokerage_name || null,
      url: rawUrl ? `https://www.zillow.com${rawUrl}` : null,
      soldDate: l.sold_date || null,
    };
  }

  private reviewerName(reviewer: any): string | null {
    if (!reviewer) return null;
    const full = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ').trim();
    return full || reviewer.screenName || null;
  }

  private num(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'string' ? parseFloat(value.replace(/[,$]/g, '')) : Number(value);
    return isNaN(n) ? null : n;
  }
}

export const agentApi = new AgentApiService();
