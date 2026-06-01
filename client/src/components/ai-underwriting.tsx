import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Property } from '@shared/schema';
import { Calculator, Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AIUnderwritingProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UnderwritingData {
  investorType: string;
  targetReturn: string;
  financing: string;
  holdPeriod: string;
  renovationBudget: string;
  notes: string;
}

export function AIUnderwriting({ property, open, onOpenChange }: AIUnderwritingProps) {
  const [underwritingData, setUnderwritingData] = useState<UnderwritingData>({
    investorType: 'buy-and-hold',
    targetReturn: '12',
    financing: 'conventional',
    holdPeriod: '5',
    renovationBudget: '0',
    notes: ''
  });

  const [generatedChecklist, setGeneratedChecklist] = useState<string>('');

  const generateUnderwritingMutation = useMutation({
    mutationFn: async (data: UnderwritingData & { property: Property }) => {
      const response = await apiRequest('POST', '/api/ai/generate-underwriting', data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedChecklist(data.checklist);
    }
  });

  const handleGenerateUnderwriting = () => {
    generateUnderwritingMutation.mutate({
      ...underwritingData,
      property
    });
  };

  const downloadChecklist = () => {
    if (!generatedChecklist) return;
    
    const blob = new Blob([generatedChecklist], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Underwriting-Checklist-${(property.address ?? property.zpid).replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getUnderwritingComplexity = () => {
    const price = Number(property.price);
    const score = Number(property.investmentScorePercent ?? 0);

    if (price > 1000000 || score < 40) return 'Complex';
    if (price > 500000 || score < 60) return 'Moderate';
    return 'Standard';
  };

  const getEstimatedTimeline = () => {
    const complexity = getUnderwritingComplexity();
    switch (complexity) {
      case 'Complex': return '7-14 days';
      case 'Moderate': return '3-7 days';
      default: return '1-3 days';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            AI Underwriting Assistant - {property.address ?? property.fullAddress ?? property.zpid}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Underwriting Parameters */}
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Underwriting Overview</h3>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <div>Property Value: ${Number(property.price).toLocaleString()}</div>
                <div>Property Score: {Math.round(Number(property.investmentScorePercent ?? 0))}/100</div>
                <div>Complexity Level: {getUnderwritingComplexity()}</div>
                <div>Est. Timeline: {getEstimatedTimeline()}</div>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-2">Key Underwriting Focus Areas</h4>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  {Number(property.investmentScorePercent ?? 0) >= 75 ? (
                    <>
                      <div>• Confirm strong fundamentals and market position</div>
                      <div>• Validate premium pricing assumptions</div>
                      <div>• Assess competitive advantages</div>
                    </>
                  ) : Number(property.investmentScorePercent ?? 0) >= 50 ? (
                    <>
                      <div>• Identify value-add opportunities</div>
                      <div>• Analyze market positioning gaps</div>
                      <div>• Evaluate improvement potential</div>
                    </>
                  ) : (
                    <>
                      <div>• Deep dive cash flow analysis required</div>
                      <div>• Extensive market comp validation</div>
                      <div>• Risk mitigation strategy assessment</div>
                    </>
                  )}
                </div>
              </div>
              
              <Button
                onClick={handleGenerateUnderwriting}
                disabled={generateUnderwritingMutation.isPending}
                className="w-full mt-3"
              >
                {generateUnderwritingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                Generate Underwriting Checklist
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="investorType">Investor Type</Label>
                <Select value={underwritingData.investorType} onValueChange={(value) => setUnderwritingData(prev => ({ ...prev, investorType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy-and-hold">Buy & Hold</SelectItem>
                    <SelectItem value="brrrr">BRRRR Strategy</SelectItem>
                    <SelectItem value="fix-and-flip">Fix & Flip</SelectItem>
                    <SelectItem value="syndication">Syndication</SelectItem>
                    <SelectItem value="cash-buyer">Cash Buyer</SelectItem>
                    <SelectItem value="1031-exchange">1031 Exchange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetReturn">Target Return (%)</Label>
                <Input
                  id="targetReturn"
                  value={underwritingData.targetReturn}
                  onChange={(e) => setUnderwritingData(prev => ({ ...prev, targetReturn: e.target.value }))}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="financing">Financing Strategy</Label>
                <Select value={underwritingData.financing} onValueChange={(value) => setUnderwritingData(prev => ({ ...prev, financing: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conventional">Conventional Loan</SelectItem>
                    <SelectItem value="dscr">DSCR Loan</SelectItem>
                    <SelectItem value="hard-money">Hard Money</SelectItem>
                    <SelectItem value="cash">All Cash</SelectItem>
                    <SelectItem value="seller-finance">Seller Financing</SelectItem>
                    <SelectItem value="portfolio-lender">Portfolio Lender</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="holdPeriod">Hold Period (Years)</Label>
                <Input
                  id="holdPeriod"
                  value={underwritingData.holdPeriod}
                  onChange={(e) => setUnderwritingData(prev => ({ ...prev, holdPeriod: e.target.value }))}
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="renovationBudget">Renovation Budget</Label>
              <Input
                id="renovationBudget"
                value={underwritingData.renovationBudget}
                onChange={(e) => setUnderwritingData(prev => ({ ...prev, renovationBudget: e.target.value }))}
                placeholder="25000"
              />
            </div>

            <div>
              <Label htmlFor="notes">Special Considerations</Label>
              <Textarea
                id="notes"
                value={underwritingData.notes}
                onChange={(e) => setUnderwritingData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Environmental concerns, zoning issues, tenant situations, etc."
              />
            </div>
          </div>

          {/* Right Column - Generated Checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Underwriting Checklist & Requirements</h3>
              {generatedChecklist && (
                <Button onClick={downloadChecklist} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 min-h-[500px]">
              {generateUnderwritingMutation.isPending ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
              ) : generatedChecklist ? (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{generatedChecklist}</pre>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center h-64 flex items-center justify-center">
                  Click "Generate Underwriting Checklist" to create your comprehensive due diligence requirements
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}