import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatCompactPrice as formatPrice } from '@/lib/format';
import { apiRequest } from '@/lib/queryClient';
import { Search, MapPin, Phone, User, Star, ExternalLink, ArrowLeft } from 'lucide-react';

interface AgentSummary {
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

interface AgentListing {
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

interface AgentReview {
  id: string;
  rating: number;
  comment: string;
  date: string;
  reviewer: string | null;
  workDescription: string | null;
  subRatings: Array<{ description: string; score: number }>;
}

interface AgentProfile {
  zuid: string;
  activeListings: AgentListing[];
  activeCount: number;
  soldListings: AgentListing[];
  soldCount: number;
  reviews: AgentReview[];
  reviewCount: number;
  avgRating: number;
}

function Stars({ rating }: { rating: number }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center text-amber-500" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-4 h-4"
          fill={i <= Math.round(rating) ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

export default function AgentLookupPage() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<AgentSummary[]>([]);
  const [selected, setSelected] = useState<AgentSummary | null>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (vars: { name: string; location: string }) => {
      const params = new URLSearchParams({ name: vars.name });
      if (vars.location) params.set('location', vars.location);
      const res = await apiRequest('GET', `/api/agents/search?${params.toString()}`);
      return (await res.json()) as { agents: AgentSummary[] };
    },
    onSuccess: (data) => {
      setResults(data.agents);
      setSelected(null);
      if (data.agents.length === 0) {
        toast({ title: 'No agents found', description: 'Try a different name or add a location.' });
      }
    },
    onError: (error) => {
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery<AgentProfile>({
    queryKey: [`/api/agents/${selected?.zuid}`],
    enabled: !!selected,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) searchMutation.mutate({ name: name.trim(), location: location.trim() });
  };

  // Auto-run a search when arriving with ?name= (e.g. from a property card's
  // agent link), so "who do I call" flows straight into "are they any good".
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const qName = sp.get('name');
    if (qName) {
      const qLoc = sp.get('location') || '';
      setName(qName);
      setLocation(qLoc);
      searchMutation.mutate({ name: qName, location: qLoc });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Agent Lookup</h1>
          <p className="text-slate-600">
            Research a listing agent before you reach out — their active and sold listings, plus client reviews.
          </p>
        </div>

        {/* Search form */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent name (e.g. Jenna Hensley)"
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (optional)"
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={!name.trim() || searchMutation.isPending} className="sm:w-40">
                {searchMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find Agents
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results list (hidden once an agent is selected) */}
        {!selected && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((agent) => (
              <Card
                key={agent.zuid}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(agent)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  {agent.photo ? (
                    <img src={agent.photo} alt={agent.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{agent.name}</p>
                    {agent.brokerage && <p className="text-sm text-slate-600 truncate">{agent.brokerage}</p>}
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      {agent.location && <span className="truncate">{agent.location}</span>}
                      {agent.reviewCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Stars rating={agent.rating} />
                          {agent.reviewCount}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Selected agent profile */}
        {selected && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-slate-600">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to results
            </Button>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {selected.photo ? (
                    <img src={selected.photo} alt={selected.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                    {selected.brokerage && <p className="text-slate-600">{selected.brokerage}</p>}
                    {selected.location && (
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" /> {selected.location}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {(profile?.avgRating || selected.rating) > 0 && (
                        <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                          <Stars rating={profile?.avgRating || selected.rating} />
                          {(profile?.avgRating || selected.rating).toFixed(1)}
                          <span className="text-slate-400">({profile?.reviewCount ?? selected.reviewCount} reviews)</span>
                        </span>
                      )}
                      {selected.phone && (
                        <a href={`tel:${selected.phone}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                          <Phone className="w-4 h-4 mr-1" /> {selected.phone}
                        </a>
                      )}
                      {selected.profileUrl && (
                        <a href={selected.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
                          <ExternalLink className="w-4 h-4 mr-1" /> Zillow profile
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stat row */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <Stat label="Active listings" value={profile ? String(profile.activeListings.length) : '—'} />
                  <Stat label="Sold (recent)" value={profile ? String(profile.soldListings.length) : '—'} />
                  <Stat label="Reviews" value={profile ? String(profile.reviewCount) : '—'} />
                </div>
              </CardContent>
            </Card>

            {profileLoading ? (
              <Card><CardContent className="py-12 text-center text-slate-500">Loading agent activity…</CardContent></Card>
            ) : profile ? (
              <Tabs defaultValue="active" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="active">Active ({profile.activeListings.length})</TabsTrigger>
                  <TabsTrigger value="sold">Sold ({profile.soldListings.length})</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({profile.reviewCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  <ListingGrid listings={profile.activeListings} emptyText="No active listings." />
                </TabsContent>
                <TabsContent value="sold">
                  <ListingGrid listings={profile.soldListings} emptyText="No recent sold listings." />
                </TabsContent>
                <TabsContent value="reviews">
                  {profile.reviews.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-slate-500">No reviews yet.</CardContent></Card>
                  ) : (
                    <div className="space-y-3">
                      {profile.reviews.map((r) => (
                        <Card key={r.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Stars rating={r.rating} />
                                <span className="text-sm font-medium text-slate-700">{r.reviewer || 'Anonymous'}</span>
                              </div>
                              {r.date && <span className="text-xs text-slate-400">{r.date.slice(0, 10)}</span>}
                            </div>
                            {r.workDescription && <p className="text-xs text-slate-500 mb-2">{r.workDescription}</p>}
                            <p className="text-sm text-slate-700 whitespace-pre-line line-clamp-6">{r.comment}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        )}

        {/* Empty state */}
        {!selected && results.length === 0 && !searchMutation.isPending && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-1">Look up an agent</h3>
              <p>Search by name (a location narrows the results) to see their listings and reviews.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ListingGrid({ listings, emptyText }: { listings: AgentListing[]; emptyText: string }) {
  if (listings.length === 0) {
    return <Card><CardContent className="py-8 text-center text-slate-500">{emptyText}</CardContent></Card>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {listings.map((l) => (
        <Card key={l.zpid} className="overflow-hidden">
          <CardContent className="p-0">
            {l.photo && (
              <img src={l.photo} alt={l.address} className="w-full h-36 object-cover" />
            )}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{l.price != null ? formatPrice(l.price) : '—'}</p>
                {l.status && <Badge variant="outline" className="capitalize text-xs">{l.status}</Badge>}
              </div>
              <p className="text-sm text-slate-700 truncate">{l.address}</p>
              <p className="text-xs text-slate-500 truncate">{[l.city, l.state].filter(Boolean).join(', ')}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                {l.beds != null && <span>{l.beds} bd</span>}
                {l.baths != null && <span>{l.baths} ba</span>}
                {l.soldDate && <span>Sold {l.soldDate}</span>}
                {l.url && (
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-700 ml-auto">
                    <ExternalLink className="w-3.5 h-3.5 mr-0.5" /> View
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
