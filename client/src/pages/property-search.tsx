import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';

// Search results scoring above this auto-load their full Zillow detail (agent,
// zestimate, taxes, schools, risk) so high-potential deals surface enriched
// data without a click. Mirrors the server-side first-import enrichment rule.
const AUTO_ENRICH_SCORE_THRESHOLD = 50;

// Redfin's detail endpoint returns a different shape than Zillow's; map the
// overlapping fields onto the names EnrichmentPanel reads (it null-guards the
// rest, so Zillow-only fields like schools/climate just don't render).
function normalizeRedfinDetail(d: any) {
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
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatCompactPrice as formatPrice } from '@/lib/format';
import { apiRequest } from '@/lib/queryClient';
import { Building2, Home, Search, Filter, MapPin, DollarSign, BarChart3, TrendingUp, Phone, User, Sparkles, Star, GraduationCap, ShieldAlert, Loader2, ExternalLink, Wallet, ShieldCheck } from 'lucide-react';

const searchFormSchema = z.object({
  platform: z.enum(['zillow', 'loopnet', 'redfin', 'crexi', 'multi']),
  location: z.string().min(1, 'Location is required'),
  propertyType: z.enum(['residential', 'commercial', 'mixed']).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  bedsMin: z.number().min(0).optional(),
  bedsMax: z.number().min(0).optional(),
  bathsMin: z.number().min(0).optional(),
  bathsMax: z.number().min(0).optional(),
  sqftMin: z.number().min(0).optional(),
  sqftMax: z.number().min(0).optional(),
  homeType: z.string().optional(),
  propertyTypes: z.array(z.string()).optional(),
  maxResults: z.number().min(1).max(100).default(20),
  saveResults: z.boolean().default(false),
});

type SearchFormData = z.infer<typeof searchFormSchema>;

interface SearchResult {
  platform: string;
  totalFound: number;
  imported: number;
  errors: number;
  properties: any[];
  errorMessages: string[];
  duplicates?: number;
  saveMessage?: string;
}

const platformInfo = {
  zillow: {
    name: 'Zillow',
    icon: Home,
    color: 'bg-blue-500',
    description: 'Residential properties, condos, and land',
    propertyTypes: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'Land'],
  },
  loopnet: {
    name: 'LoopNet',
    icon: Building2,
    color: 'bg-green-500',
    description: 'Commercial properties with coordinates',
    propertyTypes: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use', 'Hotel', 'Land'],
  },
  redfin: {
    name: 'Redfin',
    icon: Home,
    color: 'bg-gray-400',
    description: 'Residential properties (limited coverage)',
    propertyTypes: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family'],
  },
  crexi: {
    name: 'Crexi',
    icon: Building2,
    color: 'bg-orange-500',
    description: 'Commercial listings (office, retail, industrial, land)',
    propertyTypes: ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Hospitality', 'Mixed Use'],
  },
  multi: {
    name: 'Multi-Platform',
    icon: Search,
    color: 'bg-purple-500',
    description: 'Search all platforms simultaneously',
    propertyTypes: [],
  },
};

export default function PropertySearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('multi');
  const { toast } = useToast();

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      platform: 'multi',
      location: '',
      propertyTypes: [],
      priceMin: undefined,
      priceMax: undefined,
      bedsMin: undefined,
      bedsMax: undefined,
      bathsMin: undefined,
      bathsMax: undefined,
      sqftMin: undefined,
      sqftMax: undefined,
      homeType: undefined,
      maxResults: 25,
      saveResults: false,
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: SearchFormData) => {
      if (data.platform === 'multi') {
        // Multi-platform search
        const response = await apiRequest('POST', '/api/search/multi-platform', { ...data, platform: undefined });
        return await response.json();
      } else {
        // Single platform search
        let endpoint = '/api/zillow/search';
        if (data.platform === 'loopnet') endpoint = '/api/loopnet/search';
        if (data.platform === 'redfin') endpoint = '/api/redfin/search';
        if (data.platform === 'crexi') endpoint = '/api/crexi/search';

        const response = await apiRequest('POST', endpoint, data);
        return await response.json();
      }
    },
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setSearchResults(data);
        const totalProperties = data.reduce((sum, result) => sum + result.properties.length, 0);
        const savedResults = data.filter(result => result.saveMessage);
        
        let description = `Found ${totalProperties} properties across ${data.length} platforms`;
        if (savedResults.length > 0) {
          description += '\n' + savedResults.map(result => result.saveMessage).join('\n');
        }
        
        toast({
          title: 'Search completed',
          description,
        });
      } else {
        setSearchResults([data]);
        let description = `Found ${data.properties.length} properties`;
        if (data.saveMessage) {
          description += '\n' + data.saveMessage;
        }
        
        toast({
          title: 'Search completed',
          description,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SearchFormData) => {
    searchMutation.mutate(data);
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    form.setValue('platform', platform as any);
    form.setValue('propertyTypes', []);
    
    // Clear residential-specific fields when switching to commercial
    if (platform === 'loopnet' || platform === 'crexi') {
      form.setValue('bedsMin', undefined);
      form.setValue('bedsMax', undefined);
      form.setValue('bathsMin', undefined);
      form.setValue('bathsMax', undefined);
      form.setValue('homeType', undefined);
    }
  };

  const currentPlatform = platformInfo[selectedPlatform as keyof typeof platformInfo];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Multi-Platform Property Search
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Search across multiple real estate platforms to find the best investment opportunities.
            Compare residential and commercial properties with our comprehensive scoring system.
          </p>
        </div>

        {/* Platform Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {Object.entries(platformInfo).map(([key, info]) => {
            const Icon = info.icon;
            return (
              <Card 
                key={key}
                className={`cursor-pointer transition-all ${
                  selectedPlatform === key 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => handlePlatformChange(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${info.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{info.name}</h3>
                      <p className="text-sm text-slate-600">{info.description}</p>
                    </div>
                    {selectedPlatform === key && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Search Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Location */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <Input 
                                {...field} 
                                placeholder="City, State or ZIP" 
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Property Type for Multi-Platform */}
                    {selectedPlatform === 'multi' && (
                      <FormField
                        control={form.control}
                        name="propertyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="residential">Residential</SelectItem>
                                <SelectItem value="commercial">Commercial</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Property Types */}
                    {currentPlatform.propertyTypes.length > 0 && (
                      <FormField
                        control={form.control}
                        name="propertyTypes"
                        render={() => (
                          <FormItem>
                            <FormLabel>Property Types</FormLabel>
                            <div className="grid grid-cols-1 gap-2">
                              {currentPlatform.propertyTypes.map((type) => (
                                <FormField
                                  key={type}
                                  control={form.control}
                                  name="propertyTypes"
                                  render={({ field }) => (
                                    <FormItem
                                      key={type}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(type)}
                                          onCheckedChange={(checked) => {
                                            const current = field.value || [];
                                            const updated = checked
                                              ? [...current, type]
                                              : current.filter((value) => value !== type);
                                            field.onChange(updated);
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal text-sm">
                                        {type}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Price Range */}
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="priceMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Price</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input 
                                  {...field} 
                                  type="number"
                                  placeholder="0"
                                  className="pl-10"
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priceMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Price</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input 
                                  {...field} 
                                  type="number"
                                  placeholder="Any"
                                  className="pl-10"
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Bedrooms/Bathrooms for Residential */}
                    {selectedPlatform !== 'loopnet' && selectedPlatform !== 'crexi' && (
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="bedsMin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Beds</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  placeholder="Any"
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bathsMin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Baths</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  placeholder="Any"
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Square Footage */}
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="sqftMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Sq Ft</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                placeholder="0"
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sqftMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Sq Ft</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                placeholder="Any"
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Max Results */}
                    <FormField
                      control={form.control}
                      name="maxResults"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Results</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              min="1"
                              max="100"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum number of properties to return (1-100)
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Save Results */}
                    <FormField
                      control={form.control}
                      name="saveResults"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Save search results to database
                            </FormLabel>
                            <FormDescription>
                              Save found properties to your database for analysis in Browse Properties
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={searchMutation.isPending}
                    >
                      {searchMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search Properties
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {searchResults.length > 0 && (
              <Tabs defaultValue={searchResults[0]?.platform || 'results'} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((result, index) => {
                    const platform = platformInfo[result.platform as keyof typeof platformInfo];
                    const Icon = platform?.icon || Search;
                    return (
                      <TabsTrigger key={index} value={result.platform} className="flex items-center space-x-2">
                        <Icon className="w-4 h-4" />
                        <span>{platform?.name || result.platform}</span>
                        <Badge variant="secondary" className="ml-1">
                          {result.properties.length}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {searchResults.map((result, index) => (
                  <TabsContent key={index} value={result.platform}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{platformInfo[result.platform as keyof typeof platformInfo]?.name || result.platform} Results</span>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span>Found: {result.totalFound}</span>
                            <span>Scored: {result.properties.length}</span>
                            {result.errors > 0 && (
                              <span className="text-red-600">Errors: {result.errors}</span>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {result.properties.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4">
                            {result.properties.map((property, propertyIndex) => (
                              <PropertyCard key={propertyIndex} property={property} platform={result.platform} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-500">
                            No properties found. Try adjusting your search criteria.
                          </div>
                        )}

                        {result.errorMessages.length > 0 && (
                          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h4 className="font-medium text-red-800 mb-2">Search Issues:</h4>
                            <ul className="list-disc list-inside text-sm text-red-700">
                              {result.errorMessages.map((error, errorIndex) => (
                                <li key={errorIndex}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {searchResults.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-slate-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-medium mb-2">Ready to Search</h3>
                    <p>Enter your search criteria and click "Search Properties" to find investment opportunities.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ property, platform }: { property: any; platform: string }) {

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // On-demand full enrichment (Zillow): the search payload only has the
  // brokerage name, so "Load agent & details" fetches the listing agent plus
  // zestimate/rent/tax/schools/history the lightweight result omits.
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Zillow enriches by zpid; Redfin by its listing url. Other platforms have no
  // detail fetcher yet.
  const redfinUrl = property.listingUrl || property.url;
  const isCommercial = platform === 'crexi' || platform === 'loopnet';
  const canEnrich =
    (platform === 'zillow' && !!property.id) ||
    (platform === 'redfin' && !!redfinUrl) ||
    (platform === 'crexi' && !!property.id);

  const [autoFailed, setAutoFailed] = useState(false);

  const loadDetails = async (isAuto = false) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      if (platform === 'redfin') {
        const res = await apiRequest('GET', `/api/redfin/property?url=${encodeURIComponent(redfinUrl)}`);
        setDetail(normalizeRedfinDetail(await res.json()));
      } else if (platform === 'crexi') {
        const slug = property.listingSlug ? `?slug=${encodeURIComponent(property.listingSlug)}` : '';
        const res = await apiRequest('GET', `/api/crexi/listing/${encodeURIComponent(property.id)}${slug}`);
        setDetail(await res.json());
      } else {
        const res = await apiRequest('GET', `/api/zillow/property/${encodeURIComponent(property.id)}`);
        setDetail(await res.json());
      }
    } catch {
      // Auto-enrich failures stay silent (e.g. a platform whose detail endpoint
      // is unavailable shouldn't nag on every card); manual clicks show a retry.
      if (isAuto) setAutoFailed(true);
      else setDetailError('Could not load details. Try again.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Auto-enrich high-scoring cards, lazily: only fire when the card scrolls
  // into view (so a large result set doesn't trigger dozens of API calls at
  // once), and only once per card.
  const cardRef = useRef<HTMLDivElement>(null);
  const autoTried = useRef(false);
  const shouldAutoEnrich = canEnrich && (property.score ?? 0) > AUTO_ENRICH_SCORE_THRESHOLD;
  useEffect(() => {
    if (!shouldAutoEnrich) return;
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !autoTried.current) {
          autoTried.current = true;
          loadDetails(true);
          obs.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoEnrich]);

  // Prefer the enriched agent (has a full name + rating + zuid) over the
  // search-payload brokerage.
  const agent = detail?.agent || property.agent || null;

  // Deep-link a named agent into Agent Lookup with the property's market
  // prefilled, so "who do I call" flows into "are they any good".
  const agentLocation = [property.address?.city, property.address?.state].filter(Boolean).join(', ');
  const agentLookupHref = agent?.name
    ? `/agent-lookup?name=${encodeURIComponent(agent.name)}${agentLocation ? `&location=${encodeURIComponent(agentLocation)}` : ''}`
    : '';

  // Adaptive metrics. Commercial listings often withhold price and are sized in
  // units (multifamily) or building SF, scored on cap rate rather than ROI.
  const d = (isCommercial ? detail : null) || {};
  const units = property.units ?? d.units;
  const capRate = property.capRate ?? d.capRate;
  const sqft = property.sqft ?? property.sizeSqFt ?? d.squareFootage;
  const priceDisplay =
    property.unpriced || !property.price ? 'Contact for price' : formatPrice(property.price);
  const sizeDisplay = isCommercial
    ? units != null
      ? `${units} units`
      : sqft
        ? `${Number(sqft).toLocaleString()} sq ft`
        : '—'
    : `${(property.sqft ?? property.sizeSqFt ?? 0).toLocaleString()} sq ft`;
  const assetType = [property.propertyType || property.homeType, property.subtype || d.subtype]
    .filter(Boolean)
    .join(' · ');
  const occupancy = property.occupancy ?? d.occupancy;
  const yearBuilt = property.yearBuilt ?? d.yearBuilt;
  const showOZ = property.isOpportunityZone || d.isOpportunityZone;
  const showOM = property.hasOM || d.hasOM;

  return (
    <Card ref={cardRef} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">
              {property.address?.streetAddress || property.address}
            </h3>
            <p className="text-sm text-slate-600">
              {property.address?.city || property.city}, {property.address?.state || property.state} {property.address?.zipCode || property.zipcode}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getScoreColor(property.score)} text-white`}>
              {property.score}/100
            </Badge>
            <Badge variant="outline" className="capitalize">
              {platform}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Price</p>
            <p className="font-semibold">{priceDisplay}</p>
          </div>
          <div>
            <p className="text-slate-600">Type</p>
            <p className="font-semibold">{isCommercial ? (assetType || 'Commercial') : (property.propertyType || property.homeType)}</p>
          </div>
          <div>
            <p className="text-slate-600">Size</p>
            <p className="font-semibold">{sizeDisplay}</p>
          </div>
          <div>
            <p className="text-slate-600">{isCommercial ? 'Cap rate' : 'ROI'}</p>
            <p className="font-semibold text-green-600">
              {isCommercial ? (capRate != null ? `${capRate}%` : '—') : `${property.estimatedRoi}%`}
            </p>
          </div>
        </div>

        {!isCommercial && (property.bedrooms || property.numBeds) && (
          <div className="mt-3 flex items-center space-x-4 text-sm text-slate-600">
            <span>{property.bedrooms || property.numBeds} beds</span>
            <span>{property.bathrooms || property.numBaths} baths</span>
            {property.yearBuilt && <span>Built {property.yearBuilt}</span>}
          </div>
        )}

        {isCommercial && (occupancy != null || yearBuilt != null || property.investmentType || property.noi) && (
          <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {occupancy != null && <span>{occupancy}% occupied</span>}
            {yearBuilt != null && <span>Built {yearBuilt}</span>}
            {property.investmentType && <span>{property.investmentType}</span>}
            {property.noi && <span>NOI: ${property.noi.toLocaleString()}</span>}
          </div>
        )}

        {isCommercial && (showOZ || showOM) && (
          <div className="mt-2 flex items-center flex-wrap gap-1.5">
            {showOZ && <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">Opportunity Zone</Badge>}
            {showOM && <Badge variant="outline" className="text-xs">OM available</Badge>}
          </div>
        )}

        {agent && (agent.name || agent.company) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              {agent.photo ? (
                <img
                  src={agent.photo}
                  alt={agent.name || agent.company}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                {agent.name ? (
                  <Link
                    href={agentLookupHref}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate block"
                    title="Look up this agent"
                  >
                    {agent.name}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-slate-700 truncate">{agent.company}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {agent.name && agent.company && <span className="truncate">{agent.company}</span>}
                  {agent.rating > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-500">
                      <Star className="w-3 h-3" fill="currentColor" />
                      {agent.rating}
                      {agent.reviewCount ? <span className="text-slate-400">({agent.reviewCount})</span> : null}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                <Phone className="w-4 h-4 mr-1" />
                {agent.phone}
              </a>
            )}
          </div>
        )}

        {/* Full enrichment. High-scoring cards auto-load (lazily) and stay
            silent on failure; lower-scoring cards expose a manual button. */}
        {canEnrich && !detail && shouldAutoEnrich && !autoFailed && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-2 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-loading full details (score {property.score})…
            </p>
          </div>
        )}
        {canEnrich && !detail && (!shouldAutoEnrich || autoFailed) && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" className="w-full" onClick={() => loadDetails(false)} disabled={loadingDetail}>
              {loadingDetail ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> {isCommercial ? 'Load full details' : 'Load agent & full details'}</>
              )}
            </Button>
            {detailError && <p className="text-xs text-red-600 mt-2 text-center">{detailError}</p>}
          </div>
        )}

        {detail && (isCommercial ? <CommercialEnrichmentPanel detail={detail} /> : <EnrichmentPanel detail={detail} />)}

        <BuyerMatchRow property={property} />
      </CardContent>
    </Card>
  );
}

// "Find cash buyers" — matches this result against the tenant's buyer buy-boxes.
function BuyerMatchRow({ property }: { property: any }) {
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
          <p className="text-sm font-medium text-green-700 flex items-center gap-1.5 mb-1">
            <Wallet className="w-4 h-4" /> {result.count} cash buyer{result.count > 1 ? 's' : ''} want this
          </p>
          <ul className="space-y-1">
            {result.buyers.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate flex items-center gap-1.5">
                  {b.name}
                  {b.company && <span className="text-slate-400 text-xs truncate">· {b.company}</span>}
                  {b.proofOfFunds && <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                </span>
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 whitespace-nowrap text-xs">
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
function CommercialEnrichmentPanel({ detail }: { detail: any }) {
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

function EnrichmentPanel({ detail }: { detail: any }) {
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
          <a href={detail.virtualTour} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-700 ml-auto">
            <ExternalLink className="w-3.5 h-3.5 mr-0.5" /> Virtual tour
          </a>
        )}
      </div>
    </div>
  );
}