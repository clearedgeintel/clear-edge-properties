import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Property, UserProperty } from "@shared/schema";
import { formatCurrency } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, Target, AlertTriangle, CheckCircle, ArrowRight, Lightbulb, BarChart, Heart, Building } from "lucide-react";

type TrackedItem = UserProperty & { property: Property | null };

interface PropertyComparison {
  summary: string;
  recommendation: string;
  properties: Array<{
    zpid: string;
    rank: number;
    pros: string[];
    cons: string[];
    exitStrategies: Array<{
      strategy: string;
      timeline: string;
      expectedReturn: string;
      riskLevel: "Low" | "Medium" | "High";
    }>;
    riskScore: number;
    adjustedReturn: number;
  }>;
  marketInsights: string[];
  riskFactors: string[];
}

export default function DealComparisonPage() {
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [comparison, setComparison] = useState<PropertyComparison | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [propertySource, setPropertySource] = useState<"all" | "watchlist">("all");

  const { data: allProperties, isLoading: isLoadingAll } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: trackedItems, isLoading: isLoadingWatchlist } = useQuery<TrackedItem[]>({
    queryKey: ["/api/watchlist"],
  });

  // Tracked items come as { ...userProperty, property }. Flatten to the
  // underlying Property records (dropping any that failed to load).
  const watchlistProperties: Property[] = (trackedItems ?? [])
    .map((item) => item.property)
    .filter((p): p is Property => !!p);

  const properties = propertySource === "all" ? allProperties : watchlistProperties;
  const isLoading = propertySource === "all" ? isLoadingAll : isLoadingWatchlist;

  const handlePropertySelect = (property: Property, checked: boolean) => {
    if (checked) {
      if (selectedProperties.length < 3) {
        setSelectedProperties([...selectedProperties, property]);
      }
    } else {
      setSelectedProperties(selectedProperties.filter(p => p.zpid !== property.zpid));
    }
  };

  const handleSourceChange = (newSource: "all" | "watchlist") => {
    setPropertySource(newSource);
    setSelectedProperties([]); // Clear selections when switching sources
    setComparison(null); // Clear previous comparison
  };

  const isPropertySelected = (zpid: string) => {
    return selectedProperties.some(p => p.zpid === zpid);
  };

  const analyzeDeals = async () => {
    if (selectedProperties.length < 2) return;

    setIsAnalyzing(true);

    try {
      const response = await apiRequest('POST', '/api/ai/compare-deals', {
        zpids: selectedProperties.map(p => p.zpid),
      });
      const result = await response.json();
      setComparison(result);
    } catch (error) {
      console.error('Deal comparison failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreBadgeColor = (score: number | string | null | undefined): string => {
    const value = Number(score ?? 0);
    if (value >= 80) return "bg-green-100 text-green-800";
    if (value >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatScore = (score: number | string | null | undefined): string => {
    return String(Math.round(Number(score ?? 0)));
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case "Low": return "text-green-600";
      case "Medium": return "text-yellow-600";
      case "High": return "text-red-600";
      default: return "text-gray-600";
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="text-center">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Deal Comparison Advisor
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select 2-3 properties for AI-powered analysis comparing pros/cons, exit strategies, and risk-adjusted returns
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Property Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Select Properties ({selectedProperties.length}/3)
                </CardTitle>
                <CardDescription>
                  Choose 2-3 properties to compare and analyze
                </CardDescription>
                
                {/* Property Source Selector */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant={propertySource === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSourceChange("all")}
                    className="flex items-center gap-2"
                  >
                    <Building className="w-4 h-4" />
                    All Properties ({allProperties?.length || 0})
                  </Button>
                  <Button
                    variant={propertySource === "watchlist" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSourceChange("watchlist")}
                    className="flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    My Deals ({watchlistProperties.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {properties?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {propertySource === "watchlist" 
                        ? "No properties in your watchlist yet. Add some properties to your watchlist from the Browse page to compare them here."
                        : "No properties available."
                      }
                    </div>
                  ) : (
                    properties?.map((property) => (
                      <div key={property.zpid} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          id={`property-${property.zpid}`}
                          checked={isPropertySelected(property.zpid)}
                          onCheckedChange={(checked) => handlePropertySelect(property, checked as boolean)}
                          disabled={!isPropertySelected(property.zpid) && selectedProperties.length >= 3}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{property.address}, {property.addressCity}, {property.addressState}</h4>
                            <Badge className={getScoreBadgeColor(property.investmentScorePercent)}>
                              {formatScore(property.investmentScorePercent)}/100
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>Price: {formatCurrency(property.price)}</div>
                            <div>Beds: {property.numBeds}</div>
                            <div>Type: {property.homeType}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  Comparison Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedProperties.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Select properties to begin analysis
                  </div>
                )}

                {selectedProperties.length === 1 && (
                  <div className="text-center py-8 text-gray-500">
                    Select at least 2 properties to compare
                  </div>
                )}

                {selectedProperties.length >= 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Selected Properties:</h4>
                      {selectedProperties.map((property) => (
                        <div key={property.zpid} className="flex items-center justify-between text-sm">
                          <span className="truncate">{property.address}, {property.addressCity}, {property.addressState}</span>
                          <Badge variant="outline">{formatScore(property.investmentScorePercent)}/100</Badge>
                        </div>
                      ))}
                    </div>

                    <Button 
                      onClick={analyzeDeals}
                      disabled={isAnalyzing}
                      className="w-full bg-gradient-to-r from-brand-blue to-brand-navy hover:opacity-90"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="w-4 h-4 mr-2" />
                          Analyze Deals
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comparison Results */}
        {comparison && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  AI Deal Comparison Analysis
                </CardTitle>
                <CardDescription>
                  Comprehensive analysis of selected properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="detailed">Property Details</TabsTrigger>
                    <TabsTrigger value="strategies">Exit Strategies</TabsTrigger>
                    <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">Executive Summary</h3>
                      <p className="text-blue-800">{comparison.summary}</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-900 mb-2">Recommendation</h3>
                      <p className="text-green-800">{comparison.recommendation}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Market Insights</h3>
                        <ul className="space-y-2">
                          {comparison.marketInsights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Risk Factors</h3>
                        <ul className="space-y-2">
                          {comparison.riskFactors.map((risk, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="detailed" className="space-y-6">
                    {comparison.properties.map((propAnalysis) => {
                      const property = selectedProperties.find(p => p.zpid === propAnalysis.zpid);
                      if (!property) return null;

                      return (
                        <Card key={propAnalysis.zpid}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                #{propAnalysis.rank} - {property.address}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge className={getScoreBadgeColor(property.investmentScorePercent)}>
                                  Score: {formatScore(property.investmentScorePercent)}/100
                                </Badge>
                                <Badge variant="outline">
                                  Risk-Adj: {propAnalysis.adjustedReturn.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold text-green-800 mb-2">Pros</h4>
                                <ul className="space-y-1 text-sm">
                                  {propAnalysis.pros.map((pro, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span>{pro}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h4 className="font-semibold text-red-800 mb-2">Cons</h4>
                                <ul className="space-y-1 text-sm">
                                  {propAnalysis.cons.map((con, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                      <span>{con}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-600">Property Price</div>
                                <div className="font-semibold">{formatCurrency(property.price)}</div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-600">Risk Score</div>
                                <div className="font-semibold">{propAnalysis.riskScore}/100</div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-600">Adj. Return</div>
                                <div className="font-semibold">{propAnalysis.adjustedReturn.toFixed(1)}%</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="strategies" className="space-y-6">
                    {comparison.properties.map((propAnalysis) => {
                      const property = selectedProperties.find(p => p.zpid === propAnalysis.zpid);
                      if (!property) return null;

                      return (
                        <Card key={propAnalysis.zpid}>
                          <CardHeader>
                            <CardTitle className="text-lg">{property.address}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4">
                              {propAnalysis.exitStrategies.map((strategy, index) => (
                                <div key={index} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">{strategy.strategy}</h4>
                                    <Badge 
                                      variant="outline" 
                                      className={getRiskColor(strategy.riskLevel)}
                                    >
                                      {strategy.riskLevel} Risk
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-600">Timeline: </span>
                                      <span className="font-medium">{strategy.timeline}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Expected Return: </span>
                                      <span className="font-medium">{strategy.expectedReturn}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="risks" className="space-y-6">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Risk analysis based on market conditions, property characteristics, and investment strategy alignment.
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-4">
                      {comparison.properties.map((propAnalysis) => {
                        const property = selectedProperties.find(p => p.zpid === propAnalysis.zpid);
                        if (!property) return null;

                        return (
                          <Card key={propAnalysis.zpid}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{property.address}</CardTitle>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Risk Score:</span>
                                  <Badge 
                                    variant="outline"
                                    className={
                                      propAnalysis.riskScore <= 30 ? "text-green-600" :
                                      propAnalysis.riskScore <= 60 ? "text-yellow-600" : "text-red-600"
                                    }
                                  >
                                    {propAnalysis.riskScore}/100
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600">Market Risk</div>
                                    <div className="font-semibold">
                                      {propAnalysis.riskScore <= 30 ? "Low" :
                                       propAnalysis.riskScore <= 60 ? "Medium" : "High"}
                                    </div>
                                  </div>
                                  <div className="bg-purple-50 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600">Liquidity Risk</div>
                                    <div className="font-semibold">
                                      {property.homeType === "SINGLE_FAMILY" ? "Low" : "Medium"}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Key Risk Factors:</h4>
                                  <ul className="space-y-1 text-sm">
                                    {propAnalysis.cons.slice(0, 3).map((risk, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span>{risk}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}