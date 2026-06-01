import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, MapPin, Building, BarChart3 } from "lucide-react";

const SCORE_COLORS: Record<string, string> = {
  "90-100": "#16a34a",
  "80-89": "#22c55e",
  "70-79": "#84cc16",
  "60-69": "#eab308",
  "50-59": "#f97316",
  "Below 50": "#ef4444",
};

const TYPE_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#6366f1"];

export default function MarketTrends() {
  const { data: zipData, isLoading: zipLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/by-zip"],
  });

  const { data: scoreData, isLoading: scoreLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/score-distribution"],
  });

  const { data: typeData, isLoading: typeLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/by-type"],
  });

  const isLoading = zipLoading || scoreLoading || typeLoading;

  const totalProperties = zipData?.reduce((sum, z) => sum + z.count, 0) ?? 0;
  const avgScore = zipData && zipData.length > 0
    ? Math.round(zipData.reduce((sum, z) => sum + z.avgScore * z.count, 0) / totalProperties)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Market Trends</h1>
          <p className="text-slate-500 mt-1">
            Analytics across your property database.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total Properties</p>
                      <p className="text-2xl font-bold">{totalProperties}</p>
                    </div>
                    <Building className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">ZIP Codes</p>
                      <p className="text-2xl font-bold">{zipData?.length ?? 0}</p>
                    </div>
                    <MapPin className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Avg Score</p>
                      <p className="text-2xl font-bold">{avgScore}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Property Types</p>
                      <p className="text-2xl font-bold">{typeData?.length ?? 0}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {scoreData && scoreData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={scoreData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Properties" radius={[4, 4, 0, 0]}>
                          {scoreData.map((entry, i) => (
                            <Cell key={i} fill={SCORE_COLORS[entry.bucket] || "#94a3b8"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-slate-400 py-12">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Property Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Property Types</CardTitle>
                </CardHeader>
                <CardContent>
                  {typeData && typeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={typeData}
                          dataKey="count"
                          nameKey="propertyType"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ propertyType, count }) => `${propertyType} (${count})`}
                          labelLine={false}
                        >
                          {typeData.map((_, i) => (
                            <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-slate-400 py-12">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ZIP Code Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Market by ZIP Code</CardTitle>
              </CardHeader>
              <CardContent>
                {zipData && zipData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={zipData.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="zipCode" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="score" orientation="left" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="price" orientation="right" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: any, name: string) => name === "Avg Price" ? formatCurrency(value) : value} />
                        <Legend />
                        <Bar yAxisId="score" dataKey="avgScore" name="Avg Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="price" dataKey="avgPrice" name="Avg Price" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="overflow-x-auto mt-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 border-b">
                            <th className="pb-2 font-medium">ZIP Code</th>
                            <th className="pb-2 font-medium">Properties</th>
                            <th className="pb-2 font-medium">Avg Score</th>
                            <th className="pb-2 font-medium">Avg Price</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Price Range</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Avg Sqft</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zipData.map((row) => (
                            <tr key={row.zipCode} className="border-b last:border-0">
                              <td className="py-2 font-medium">{row.zipCode}</td>
                              <td className="py-2">{row.count}</td>
                              <td className="py-2">
                                <Badge className={
                                  row.avgScore >= 80 ? "bg-green-100 text-green-800" :
                                  row.avgScore >= 60 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }>
                                  {row.avgScore}
                                </Badge>
                              </td>
                              <td className="py-2">{formatCurrency(row.avgPrice)}</td>
                              <td className="py-2 hidden sm:table-cell text-slate-500">
                                {formatCurrency(row.minPrice)} - {formatCurrency(row.maxPrice)}
                              </td>
                              <td className="py-2 hidden sm:table-cell text-slate-500">
                                {row.avgSqft?.toLocaleString() ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-slate-400 py-12">
                    No ZIP codes with 2+ properties yet. Import more properties to see market analytics.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
