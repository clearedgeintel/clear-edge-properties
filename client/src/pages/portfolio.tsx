import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { getDeals, DEAL_STAGES, type Deal } from "@/lib/deals";
import type { Property } from "@shared/schema";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Building,
  ArrowRight,
  Kanban,
} from "lucide-react";

export default function Portfolio() {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    setDeals(getDeals());
  }, []);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const closedDeals = deals.filter((d) => d.stage === "closed");
  const activeDeals = deals.filter((d) => d.stage !== "closed");

  const totalInvested = closedDeals.reduce((sum, d) => sum + d.price, 0);
  const activePipelineValue = activeDeals.reduce((sum, d) => sum + d.price, 0);
  const avgScore = closedDeals.length > 0
    ? Math.round(closedDeals.reduce((sum, d) => sum + d.score, 0) / closedDeals.length)
    : 0;

  // Build stage chart data
  const stageChartData = DEAL_STAGES.map((stage) => ({
    name: stage.title,
    count: deals.filter((d) => d.stage === stage.id).length,
    value: deals.filter((d) => d.stage === stage.id).reduce((sum, d) => sum + d.price, 0),
  }));

  const STAGE_COLORS = ["#3b82f6", "#eab308", "#f97316", "#22c55e"];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio</h1>
          <p className="text-slate-500 mt-1">
            Track your investments and deal pipeline performance.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Closed Deals</p>
                  <p className="text-2xl font-bold">{closedDeals.length}</p>
                </div>
                <Briefcase className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Invested</p>
                  <p className="text-2xl font-bold">
                    {totalInvested > 0 ? formatCurrency(totalInvested) : "$0"}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Pipeline</p>
                  <p className="text-2xl font-bold">
                    {activePipelineValue > 0 ? formatCurrency(activePipelineValue) : "$0"}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Avg Score (Closed)</p>
                  <p className="text-2xl font-bold">{avgScore || "—"}</p>
                </div>
                <Building className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pipeline Value by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                      {stageChartData.map((_, i) => (
                        <Bar key={i} dataKey="value" fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Kanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No deals in pipeline yet</p>
                  <Link href="/browse">
                    <Button variant="link" size="sm" className="mt-1">
                      Browse properties to get started
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Deal Stages</CardTitle>
              <Link href="/deals">
                <Button variant="ghost" size="sm">
                  Manage <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DEAL_STAGES.map((stage) => {
                  const stageDeals = deals.filter((d) => d.stage === stage.id);
                  const stageValue = stageDeals.reduce((sum, d) => sum + d.price, 0);
                  return (
                    <div key={stage.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge className={stage.color}>{stage.title}</Badge>
                        <span className="text-sm text-slate-500">
                          {stageDeals.length} deals &middot; {formatCurrency(stageValue)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{
                            width: deals.length > 0
                              ? `${(stageDeals.length / deals.length) * 100}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Closed Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Closed Investments</CardTitle>
          </CardHeader>
          <CardContent>
            {closedDeals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2 font-medium">Property</th>
                      <th className="pb-2 font-medium">Price</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedDeals.map((deal) => (
                      <tr key={deal.id} className="border-b last:border-0">
                        <td className="py-2">
                          <p className="font-medium truncate max-w-[200px]">{deal.title}</p>
                          <p className="text-xs text-slate-500">{deal.address}</p>
                        </td>
                        <td className="py-2">{formatCurrency(deal.price)}</td>
                        <td className="py-2">
                          <ScoreBadge investmentScorePercent={deal.score} />
                        </td>
                        <td className="py-2 hidden sm:table-cell text-slate-500">
                          {new Date(deal.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No closed deals yet</p>
                <p className="text-xs mt-1">Move deals to "Closed" stage in your pipeline to track them here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
