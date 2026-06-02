import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import {
  Search,
  Heart,
  Kanban,
  TrendingUp,
  Building,
  ArrowRight,
  Plus,
  Eye,
  CheckCircle2,
  Circle,
  X,
  User,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useDeals, type PipelineDeal } from "@/lib/deals";
import type { Property, UserProperty, User as DbUser, Tenant } from "@shared/schema";
import { useState } from "react";

const CHECKLIST_DISMISSED_KEY = "clearedge_checklist_dismissed";

type TrackedProperty = UserProperty & { property: Property | null };

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  check: (ctx: { watchlist?: TrackedProperty[]; deals: PipelineDeal[]; properties?: Property[] }) => boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "browse", label: "Browse scored properties", href: "/browse", check: () => true },
  { id: "search", label: "Search for properties", href: "/property-search", check: () => true },
  { id: "watchlist", label: "Add a property to your watchlist", href: "/browse", check: ({ watchlist }) => (watchlist?.length ?? 0) > 0 },
  { id: "deal", label: "Add a deal to your pipeline", href: "/deals", check: ({ deals }) => deals.length > 0 },
  { id: "compare", label: "Compare deals side-by-side", href: "/deal-comparison", check: ({ deals }) => deals.length >= 2 },
];

export default function Dashboard() {
  // Pipeline deals come from the backend now; only staged properties count.
  const { staged: deals, stages } = useDeals();
  const [checklistDismissed, setChecklistDismissed] = useState(
    () => localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "true"
  );

  const { data: auth } = useQuery<{ user: DbUser; tenant: Tenant }>({
    queryKey: ["/api/auth/user"],
  });
  const user = auth?.user;
  const displayName = user?.fullName || user?.email;

  const { data: watchlist } = useQuery<TrackedProperty[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const topProperties = properties
    ? [...properties]
        .sort(
          (a, b) =>
            Number(b.investmentScorePercent ?? 0) -
            Number(a.investmentScorePercent ?? 0)
        )
        .slice(0, 5)
    : undefined;

  const dealsByStage = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    count: deals.filter((d) => d.stageId === stage.id).length,
  }));

  const totalPipelineValue = deals.reduce((sum, d) => sum + d.price, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{displayName ? `, ${displayName}` : ""}
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening with your deals and properties.
          </p>
        </div>

        {/* Getting Started Checklist */}
        {!checklistDismissed && (() => {
          const ctx = { watchlist: watchlist ?? undefined, deals, properties: properties ?? undefined };
          const completed = CHECKLIST_ITEMS.filter(item => item.check(ctx)).length;
          const total = CHECKLIST_ITEMS.length;
          if (completed >= total) return null;
          return (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Getting Started</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
                    setChecklistDismissed(true);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-slate-500 mb-1">
                    <span>{completed} of {total} complete</span>
                  </div>
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(completed / total) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map(item => {
                    const done = item.check(ctx);
                    return (
                      <Link key={item.id} href={item.href}>
                        <div className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${done ? "text-slate-400" : "hover:bg-blue-100 text-slate-700 cursor-pointer"}`}>
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                          )}
                          <span className={done ? "line-through" : ""}>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/property-search">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Search className="h-5 w-5" />
              <span className="text-xs">Search</span>
            </Button>
          </Link>
          <Link href="/browse">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Building className="h-5 w-5" />
              <span className="text-xs">Browse</span>
            </Button>
          </Link>
          <Link href="/deals">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Kanban className="h-5 w-5" />
              <span className="text-xs">Deals</span>
            </Button>
          </Link>
          <Link href="/deal-comparison">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Compare</span>
            </Button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Watchlist</p>
                  <p className="text-2xl font-bold">{watchlist?.length ?? 0}</p>
                </div>
                <Heart className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Deals</p>
                  <p className="text-2xl font-bold">{deals.length}</p>
                </div>
                <Kanban className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pipeline Value</p>
                  <p className="text-2xl font-bold">
                    {totalPipelineValue > 0 ? formatCurrency(totalPipelineValue) : "$0"}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Properties</p>
                  <p className="text-2xl font-bold">{properties?.length ?? 0}</p>
                </div>
                <Building className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Deal Pipeline Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Deal Pipeline</CardTitle>
              <Link href="/deals">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Kanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No deals yet</p>
                  <Link href="/browse">
                    <Button variant="link" size="sm" className="mt-1">
                      <Plus className="h-3 w-3 mr-1" /> Add your first deal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {dealsByStage.map((stage) => (
                    <div key={stage.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" style={{ borderColor: stage.color || undefined, color: stage.color || undefined }}>{stage.name}</Badge>
                      </div>
                      <span className="text-lg font-semibold">{stage.count}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3 flex justify-between text-sm text-slate-500">
                    <span>Total pipeline value</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(totalPipelineValue)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Watchlist */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Watchlist</CardTitle>
              <Link href="/browse">
                <Button variant="ghost" size="sm">
                  Browse <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!watchlist || watchlist.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Heart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Your watchlist is empty</p>
                  <Link href="/browse">
                    <Button variant="link" size="sm" className="mt-1">
                      <Plus className="h-3 w-3 mr-1" /> Find properties to watch
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {watchlist.slice(0, 5).map((item) => {
                    const property = item.property;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {property?.address ?? property?.fullAddress ?? "Unknown address"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {property?.addressCity}, {property?.addressState} &middot;{" "}
                            {formatCurrency(Number(property?.price ?? 0))}
                          </p>
                        </div>
                        <ScoreBadge
                          investmentScorePercent={Math.round(Number(property?.investmentScorePercent ?? 0))}
                        />
                      </div>
                    );
                  })}
                  {watchlist.length > 5 && (
                    <p className="text-xs text-slate-400 text-center pt-1">
                      +{watchlist.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Scored Properties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Top Scored Properties</CardTitle>
            <Link href="/browse">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!topProperties || topProperties.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Building className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No properties available</p>
                <Link href="/property-search">
                  <Button variant="link" size="sm" className="mt-1">
                    <Search className="h-3 w-3 mr-1" /> Search for properties
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2 font-medium">Property</th>
                      <th className="pb-2 font-medium">Price</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">Type</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProperties.map((property) => (
                      <tr key={property.zpid} className="border-b last:border-0">
                        <td className="py-2">
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {property.address ?? property.fullAddress}
                            </p>
                            <p className="text-xs text-slate-500">
                              {property.addressCity}, {property.addressState}
                            </p>
                          </div>
                        </td>
                        <td className="py-2">{formatCurrency(Number(property.price ?? 0))}</td>
                        <td className="py-2">
                          <ScoreBadge investmentScorePercent={Math.round(Number(property.investmentScorePercent ?? 0))} />
                        </td>
                        <td className="py-2 hidden sm:table-cell text-slate-500">
                          {property.homeType}
                        </td>
                        <td className="py-2">
                          <Link href="/browse">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
