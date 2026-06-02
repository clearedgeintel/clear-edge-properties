import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Download,
  Brain,
} from "lucide-react";
import type { Property } from "@shared/schema";

interface AICommentaryProps {
  property: Property;
}

interface PropertyCommentaryAnalysis {
  summary: string;
  strengths: string[];
  concerns: string[];
  investmentRecommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid';
  riskLevel: 'Low' | 'Medium' | 'High';
  timeToDecision: string;
  keyMetrics: {
    cashFlow: string;
    appreciation: string;
    capRate: string;
    roi: string;
  };
}

export function AICommentary({ property }: AICommentaryProps) {
  const { toast } = useToast();

  // Commentary is no longer persisted — request it on demand each time the
  // property changes and just display the result.
  const {
    mutate: generateCommentary,
    data: commentary,
    isPending: isLoading,
    error,
  } = useMutation<PropertyCommentaryAnalysis, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/properties/${property.zpid}/commentary`,
      );
      return response.json();
    },
  });

  useEffect(() => {
    generateCommentary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.zpid]);

  const exportToText = () => {
    if (!commentary) return;

    try {
      const lines: string[] = [];
      lines.push('ClearEdge Props — Property Investment Analysis Report');
      lines.push('');
      lines.push(property.address ?? property.fullAddress ?? '');
      lines.push(
        `${property.addressCity ?? ''}, ${property.addressState ?? ''} ${property.addressZip ?? ''}`.trim(),
      );
      lines.push(`Price: $${Number(property.price).toLocaleString()}`);
      lines.push(
        `${property.numBeds ?? 0} bed, ${Number(property.numBaths ?? 0)} bath • ${Number(property.sizeSqFt ?? property.livingAreaSqFt ?? 0).toLocaleString()} sq ft`,
      );
      lines.push(`Generated on ${new Date().toLocaleDateString()}`);
      lines.push('');
      lines.push(`Recommendation: ${commentary.investmentRecommendation}`);
      lines.push(`Risk Level: ${commentary.riskLevel}`);
      lines.push(`Decision Timeline: ${commentary.timeToDecision}`);
      lines.push('');
      lines.push('Executive Summary:');
      lines.push(commentary.summary);
      lines.push('');
      lines.push('Key Metrics:');
      lines.push(`  Monthly Cash Flow: ${commentary.keyMetrics.cashFlow}`);
      lines.push(`  Cap Rate: ${commentary.keyMetrics.capRate}`);
      lines.push(`  Appreciation Potential: ${commentary.keyMetrics.appreciation}`);
      lines.push(`  ROI Projection: ${commentary.keyMetrics.roi}`);
      lines.push('');
      lines.push('Investment Strengths:');
      commentary.strengths.forEach((s) => lines.push(`  - ${s}`));
      lines.push('');
      lines.push('Risk Considerations:');
      commentary.concerns.forEach((c) => lines.push(`  - ${c}`));

      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clearedge-property-report-${(property.address ?? property.zpid).replace(/\s+/g, '-').toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Your property analysis report has been downloaded successfully.",
      });
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: "Export Error",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">AI Property Analysis</h3>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">Analysis Error</span>
        </div>
        <p className="text-red-700 text-sm">
          Unable to generate AI analysis. Please try again later.
        </p>
      </div>
    );
  }

  if (!commentary) return null;

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'Strong Buy': return 'bg-green-100 text-green-800 border-green-200';
      case 'Buy': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Avoid': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">AI Property Analysis</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportToText}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Investment Recommendation */}
      <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(commentary.investmentRecommendation)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold text-lg">
              {commentary.investmentRecommendation}
            </span>
          </div>
          <Badge variant="outline" className={getRiskColor(commentary.riskLevel)}>
            {commentary.riskLevel} Risk
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span>Decision Timeline: {commentary.timeToDecision}</span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-slate-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2 text-slate-800">Executive Summary</h4>
        <p className="text-slate-700 leading-relaxed">{commentary.summary}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1 text-sm">Monthly Cash Flow</h4>
          <p className="text-base font-bold text-blue-900">{commentary.keyMetrics.cashFlow}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1 text-sm">Cap Rate</h4>
          <p className="text-base font-bold text-blue-900">{commentary.keyMetrics.capRate}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1 text-sm">Appreciation Potential</h4>
          <p className="text-base font-bold text-blue-900">{commentary.keyMetrics.appreciation}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1 text-sm">ROI Projection</h4>
          <p className="text-base font-bold text-blue-900">{commentary.keyMetrics.roi}</p>
        </div>
      </div>

      {/* 3-Column Analysis Layout */}
      <div className="grid grid-cols-3 gap-5">
        {/* Investment Strengths */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-3">Investment Strengths</h4>
          <div className="space-y-2">
            {commentary.strengths.map((strength, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-green-600 font-bold text-sm">✓</span>
                <span className="text-green-800 text-sm leading-relaxed">{strength}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Considerations */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-3">Risk Considerations</h4>
          <div className="space-y-2">
            {commentary.concerns.map((concern, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold text-sm">⚠</span>
                <span className="text-yellow-800 text-sm leading-relaxed">{concern}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-semibold text-slate-800 mb-3">Key Insights</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-sm">📊</span>
              <span className="text-slate-700 text-sm">Risk: {commentary.riskLevel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-sm">⏱️</span>
              <span className="text-slate-700 text-sm">{commentary.timeToDecision}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-sm">💡</span>
              <span className="text-slate-700 text-sm">{commentary.investmentRecommendation}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
