import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/score-badge";
import { formatCurrency } from "@/lib/format";
import { Sparkles, TrendingUp, Heart } from "lucide-react";
import type { Property, UserProperty } from "@shared/schema";
import { Link } from "wouter";

type TrackedProperty = UserProperty & { property: Property | null };

function PropertyRow({ property }: { property: Property }) {
  const beds = property.numBeds;
  const baths = property.numBaths;
  const sqft = Number(property.sizeSqFt ?? property.livingAreaSqFt ?? 0);
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">
          {property.address ?? property.fullAddress}
        </p>
        <p className="text-xs text-slate-500">
          {property.addressCity}, {property.addressState} {property.addressZip} &middot;{" "}
          {beds ?? "-"}bd/{baths ?? "-"}ba &middot;{" "}
          {sqft ? sqft.toLocaleString() : "-"} sqft
        </p>
        <p className="text-sm font-medium mt-1">
          {formatCurrency(Number(property.price ?? 0))}
        </p>
      </div>
      <ScoreBadge investmentScorePercent={Math.round(Number(property.investmentScorePercent ?? 0))} />
    </div>
  );
}

export default function Recommendations() {
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: watchlist } = useQuery<TrackedProperty[]>({
    queryKey: ["/api/watchlist"],
  });

  const scoreOf = (p: Property) => Number(p.investmentScorePercent ?? 0);

  // Build client-side aggregates over the user's tracked properties to infer
  // preferences (replaces the removed server-side AI recommendations endpoint).
  const tracked = (watchlist ?? [])
    .map((w) => w.property)
    .filter((p): p is Property => Boolean(p));

  const hasPreferences = tracked.length > 0;

  const avgScore = hasPreferences
    ? Math.round(
        tracked.reduce((sum, p) => sum + scoreOf(p), 0) / tracked.length
      )
    : 0;
  const avgPrice = hasPreferences
    ? Math.round(
        tracked.reduce((sum, p) => sum + Number(p.price ?? 0), 0) /
          tracked.length
      )
    : 0;
  const preferredZips = Array.from(
    new Set(tracked.map((p) => p.addressZip).filter((z): z is string => Boolean(z)))
  );
  const trackedZpids = new Set(tracked.map((p) => p.zpid));

  const sorted = (properties ?? [])
    .slice()
    .sort((a, b) => scoreOf(b) - scoreOf(a));

  // Top scored properties not already tracked.
  const recommendations = sorted
    .filter((p) => !trackedZpids.has(p.zpid))
    .slice(0, 8);

  // Diversification: high scorers in zips the user hasn't tracked yet.
  const diversification = hasPreferences
    ? sorted
        .filter(
          (p) =>
            !trackedZpids.has(p.zpid) &&
            p.addressZip != null &&
            !preferredZips.includes(p.addressZip)
        )
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-orange" />
            Recommendations
          </h1>
          <p className="text-slate-500 mt-1">
            Properties matched to your investment preferences.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-400">
              <p>No properties available yet.</p>
              <Link href="/property-search">
                <Button size="sm" variant="outline" className="mt-3">
                  Search for properties
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Preference summary */}
            {hasPreferences ? (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600">
                    Based on the {tracked.length} propert
                    {tracked.length === 1 ? "y" : "ies"} you track, here are the
                    highest-scoring listings we found.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Avg score {avgScore}
                    </Badge>
                    <Badge variant="outline">
                      {formatCurrency(avgPrice)} avg price
                    </Badge>
                    {preferredZips.slice(0, 3).map((z) => (
                      <Badge key={z} variant="outline">{z}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardContent className="pt-6 flex items-start gap-3">
                  <Heart className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Track properties to personalize your recommendations
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      We'll learn your preferences and tailor these suggestions.
                      For now, here are the top-scored listings.
                    </p>
                    <Link href="/browse">
                      <Button size="sm" variant="outline" className="mt-2">
                        Browse Properties
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-orange" />
                  For You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.map((p) => (
                  <PropertyRow key={p.zpid} property={p} />
                ))}
              </CardContent>
            </Card>

            {/* Diversification suggestions */}
            {diversification.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Diversify Your Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-500 mb-3">
                    High-scoring properties in zip codes outside your current focus.
                  </p>
                  <div className="space-y-2">
                    {diversification.map((p) => (
                      <PropertyRow key={p.zpid} property={p} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
