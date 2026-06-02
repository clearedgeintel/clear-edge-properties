import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Eye, 
  Brain, 
  FileDown, 
  Handshake,
  TrendingUp,
  Calendar,
  Filter
} from "lucide-react";

interface UsageEvent {
  id: number;
  eventType: string;
  eventCategory: string;
  eventAction: string;
  eventLabel?: string;
  path?: string;
  duration?: number;
  createdAt: string;
}

interface UsageSummary {
  id: number;
  date: string;
  totalSessions: number;
  totalPageViews: number;
  totalApiCalls: number;
  totalTimeSpent: number;
  propertiesViewed: number;
  aiRequestsCount: number;
  exportsGenerated: number;
  dealsManaged: number;
  featuresUsed: string[];
}

interface UsageAnalytics {
  dailySummaries: UsageSummary[];
  totalUsage: {
    totalSessions: number;
    totalPageViews: number;
    totalApiCalls: number;
    totalTimeSpent: number;
    totalAIRequests: number;
    totalExports: number;
    totalDealsManaged: number;
  };
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

export default function Usage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [eventFilter, setEventFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Fetch usage analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/usage/analytics", selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/usage/analytics?days=${selectedPeriod}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json() as Promise<UsageAnalytics>;
    },
  });

  // Fetch recent usage events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/usage/events", eventFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (eventFilter && eventFilter !== "all") params.append("eventType", eventFilter);
      if (categoryFilter && categoryFilter !== "all") params.append("eventCategory", categoryFilter);
      
      const response = await fetch(`/api/usage/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json() as Promise<UsageEvent[]>;
    },
  });

  const formatDuration = (milliseconds?: number) => {
    if (!milliseconds) return "0s";
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Usage Analytics</h1>
          <p className="text-slate-600">Track your platform activity and usage patterns</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Label htmlFor="period">Time Period:</Label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="billing">Billing Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <>
              {/* Usage Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Total Sessions</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {analytics.totalUsage.totalSessions || 0}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Page Views</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {analytics.totalUsage.totalPageViews || 0}
                        </p>
                      </div>
                      <Eye className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Time Spent</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {formatTime(analytics.totalUsage.totalTimeSpent || 0)}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-brand-navy" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">API Calls</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {analytics.totalUsage.totalApiCalls || 0}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">AI Requests</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {analytics.totalUsage.totalAIRequests || 0}
                        </p>
                      </div>
                      <Brain className="h-8 w-8 text-brand-blue" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Exports</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {analytics.totalUsage.totalExports || 0}
                        </p>
                      </div>
                      <FileDown className="h-8 w-8 text-teal-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Deals Managed</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {analytics.totalUsage.totalDealsManaged || 0}
                        </p>
                      </div>
                      <Handshake className="h-8 w-8 text-emerald-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Avg Daily Usage</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {Math.round((analytics.totalUsage.totalPageViews || 0) / analytics.period.days)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-rose-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Activity
                  </CardTitle>
                  <CardDescription>
                    Your daily usage over the last {analytics.period.days} days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.dailySummaries.slice(0, 10).map((summary) => (
                      <div key={summary.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="font-medium text-slate-800">
                            {new Date(summary.date).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{summary.totalPageViews} views</Badge>
                            <Badge variant="secondary">{summary.aiRequestsCount} AI requests</Badge>
                            <Badge variant="secondary">{summary.exportsGenerated} exports</Badge>
                          </div>
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatTime(summary.totalTimeSpent)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* Activity Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Activity Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All event types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All event types</SelectItem>
                      <SelectItem value="page_view">Page Views</SelectItem>
                      <SelectItem value="api_call">API Calls</SelectItem>
                      <SelectItem value="feature_use">Feature Usage</SelectItem>
                      <SelectItem value="ai_usage">AI Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="navigation">Navigation</SelectItem>
                      <SelectItem value="property">Properties</SelectItem>
                      <SelectItem value="ai">AI Features</SelectItem>
                      <SelectItem value="export">Exports</SelectItem>
                      <SelectItem value="deals">Deals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Detailed log of your platform interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : events?.length ? (
                <div className="space-y-4">
                  {events.slice(0, 50).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="font-medium text-slate-800">
                            {event.eventAction.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-slate-600">
                            {event.eventCategory} • {event.path || event.eventLabel}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {event.eventType.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {event.duration && (
                          <span>{formatDuration(event.duration)}</span>
                        )}
                        <span>{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  No activity found for the selected filters
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billable Usage</CardTitle>
              <CardDescription>
                Track usage that affects your subscription billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.totalUsage.totalAIRequests || 0}
                  </div>
                  <div className="text-sm text-blue-600">AI Requests</div>
                  <div className="text-xs text-slate-600 mt-2">
                    Counted towards your monthly limit
                  </div>
                </div>
                
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <FileDown className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <div className="text-2xl font-bold text-green-600">
                    {analytics?.totalUsage.totalExports || 0}
                  </div>
                  <div className="text-sm text-green-600">PDF Exports</div>
                  <div className="text-xs text-slate-600 mt-2">
                    Premium feature usage
                  </div>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-12 w-12 text-brand-navy mx-auto mb-4" />
                  <div className="text-2xl font-bold text-brand-navy">
                    {(analytics?.totalUsage.totalAIRequests || 0) + (analytics?.totalUsage.totalExports || 0)}
                  </div>
                  <div className="text-sm text-brand-navy">Total Billable</div>
                  <div className="text-xs text-slate-600 mt-2">
                    Combined metered usage
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-800 mb-2">Billing Information</h4>
                <p className="text-sm text-slate-600">
                  Your usage is automatically tracked and reported to Stripe for accurate billing. 
                  AI requests and PDF exports are counted as billable usage events.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}