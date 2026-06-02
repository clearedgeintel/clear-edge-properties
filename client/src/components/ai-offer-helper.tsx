import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Property } from '@shared/schema';
import { Brain, Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AIOfferHelperProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OfferData {
  buyerName: string;
  buyerEntity: string;
  buyerEmail: string;
  buyerPhone: string;
  offerPrice: string;
  earnestMoney: string;
  financing: string;
  dueDiligence: string;
  closingTimeline: string;
  contingencies: string;
  notes: string;
}

export function AIOfferHelper({ property, open, onOpenChange }: AIOfferHelperProps) {
  const [offerData, setOfferData] = useState<OfferData>({
    buyerName: '',
    buyerEntity: '',
    buyerEmail: '',
    buyerPhone: '',
    offerPrice: '',
    earnestMoney: '5000',
    financing: 'conventional',
    dueDiligence: '10',
    closingTimeline: '30',
    contingencies: 'financing, appraisal, inspection',
    notes: ''
  });

  const [suggestedOffer, setSuggestedOffer] = useState<string>('');

  const generateOfferMutation = useMutation({
    mutationFn: async (data: OfferData & { property: Property }) => {
      const response = await apiRequest('POST', '/api/ai/generate-offer', data);
      return response.json();
    },
    onSuccess: (data) => {
      setSuggestedOffer(data.offer);
    }
  });

  const handleGenerateOffer = () => {
    const marketValue = Number(property.price);
    const score = Number(property.investmentScorePercent ?? 0);
    let suggestedOfferPrice: number;
    let strategy: string;

    // Intelligent offer strategy based on property score
    if (score >= 75) {
      // High quality properties - competitive offer
      suggestedOfferPrice = Math.round(marketValue * 0.95); // 5% below asking
      strategy = 'Strong offer for quality property';
    } else if (score >= 50) {
      // Average properties - strategic discount
      suggestedOfferPrice = Math.round(marketValue * 0.88); // 12% below asking
      strategy = 'Strategic below-market offer';
    } else {
      // Lower scoring properties - cash flow focused
      // Calculate what price would yield positive cash flow
      const estimatedRent = Math.round(marketValue * 0.01); // 1% rule estimate
      const maxPurchasePrice = estimatedRent * 100; // Break-even point
      suggestedOfferPrice = Math.min(Math.round(marketValue * 0.75), maxPurchasePrice);
      strategy = 'Cash flow optimization offer';
    }
    
    const suggestedEarnest = Math.max(5000, Math.round(suggestedOfferPrice * 0.01));
    
    setOfferData(prev => ({
      ...prev,
      offerPrice: suggestedOfferPrice.toString(),
      earnestMoney: suggestedEarnest.toString(),
      notes: score < 50 ?
        `Cash flow analysis: Estimated rent ~$${Math.round(marketValue * 0.01).toLocaleString()}/month. Offer calculated for positive cash flow.` :
        prev.notes
    }));

    generateOfferMutation.mutate({
      ...offerData,
      offerPrice: suggestedOfferPrice.toString(),
      earnestMoney: suggestedEarnest.toString(),
      property
    });
  };

  const downloadOffer = () => {
    if (!suggestedOffer) return;
    
    const blob = new Blob([suggestedOffer], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Offer-${(property.address ?? property.zpid).replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-50 border-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-200 pb-4 mb-6">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-slate-900 font-bold">AI Offer Helper</div>
              <div className="text-sm text-slate-600 font-normal">{property.address ?? property.fullAddress ?? property.zpid}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Offer Parameters */}
          <div className="space-y-6">
            {/* Smart Analysis Card */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-blue-600 px-6 py-4">
                <h3 className="font-bold text-white text-lg">Smart Offer Analysis</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">${Number(property.price).toLocaleString()}</div>
                    <div className="text-sm text-slate-600">Asking Price</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(Number(property.investmentScorePercent ?? 0))}/100</div>
                    <div className="text-sm text-slate-600">Property Score</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {Number(property.investmentScorePercent ?? 0) >= 75 ? 'Premium' : Number(property.investmentScorePercent ?? 0) >= 50 ? 'Value' : 'Cash Flow'}
                    </div>
                    <div className="text-sm text-slate-600">Strategy</div>
                  </div>
                </div>

                {Number(property.investmentScorePercent ?? 0) < 50 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      Cash Flow Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <div className="font-medium text-amber-700">Est. Monthly Rent</div>
                        <div className="text-lg font-bold text-slate-900">${Math.round(Number(property.price) * 0.01).toLocaleString()}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="font-medium text-amber-700">Break-even Price</div>
                        <div className="text-lg font-bold text-slate-900">${Math.round(Number(property.price) * 0.01 * 100).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={handleGenerateOffer}
                  disabled={generateOfferMutation.isPending}
                  className="w-full bg-gradient-to-r from-brand-blue to-brand-navy hover:opacity-90 text-white border-0 py-3 text-lg font-semibold rounded-lg shadow-lg"
                >
                  {generateOfferMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Brain className="h-5 w-5 mr-2" />
                  )}
                  Generate Smart Offer
                </Button>
              </div>
            </div>

            {/* Form Fields Card */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
                <h3 className="font-bold text-white text-lg">Buyer Information</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyerName" className="text-slate-700 font-medium">Buyer Name</Label>
                    <Input
                      id="buyerName"
                      value={offerData.buyerName}
                      onChange={(e) => setOfferData(prev => ({ ...prev, buyerName: e.target.value }))}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerEntity" className="text-slate-700 font-medium">Entity (Optional)</Label>
                    <Input
                      id="buyerEntity"
                      value={offerData.buyerEntity}
                      onChange={(e) => setOfferData(prev => ({ ...prev, buyerEntity: e.target.value }))}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="LLC, Corp, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyerEmail" className="text-slate-700 font-medium">Email Address</Label>
                    <Input
                      id="buyerEmail"
                      type="email"
                      value={offerData.buyerEmail}
                      onChange={(e) => setOfferData(prev => ({ ...prev, buyerEmail: e.target.value }))}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="buyer@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerPhone" className="text-slate-700 font-medium">Phone Number</Label>
                    <Input
                      id="buyerPhone"
                      value={offerData.buyerPhone}
                      onChange={(e) => setOfferData(prev => ({ ...prev, buyerPhone: e.target.value }))}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offerPrice" className="text-slate-700 font-medium">Offer Price</Label>
                    <Input
                      id="offerPrice"
                      value={offerData.offerPrice}
                      onChange={(e) => setOfferData(prev => ({ ...prev, offerPrice: e.target.value }))}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 font-bold text-lg"
                      placeholder="$000,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="earnestMoney" className="text-slate-700 font-medium">Earnest Money</Label>
                    <Input
                      id="earnestMoney"
                      value={offerData.earnestMoney}
                      onChange={(e) => setOfferData(prev => ({ ...prev, earnestMoney: e.target.value }))}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="$5,000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="financing" className="text-slate-700 font-medium">Financing Type</Label>
                    <Select value={offerData.financing} onValueChange={(value) => setOfferData(prev => ({ ...prev, financing: value }))}>
                      <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="cash">Cash Purchase</SelectItem>
                        <SelectItem value="conventional">Conventional Loan</SelectItem>
                        <SelectItem value="seller-finance">Seller Financing</SelectItem>
                        <SelectItem value="hard-money">Hard Money Loan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDiligence" className="text-slate-700 font-medium">Due Diligence Days</Label>
                    <Input
                      id="dueDiligence"
                      value={offerData.dueDiligence}
                      onChange={(e) => setOfferData(prev => ({ ...prev, dueDiligence: e.target.value }))}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contingencies" className="text-slate-700 font-medium">Contingencies</Label>
                  <Input
                    id="contingencies"
                    value={offerData.contingencies}
                    onChange={(e) => setOfferData(prev => ({ ...prev, contingencies: e.target.value }))}
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="financing, appraisal, inspection"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-slate-700 font-medium">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={offerData.notes}
                    onChange={(e) => setOfferData(prev => ({ ...prev, notes: e.target.value }))}
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
                    placeholder="Special terms, seller motivations, timeline considerations..."
                  />
                </div>

                {/* Generate Button */}
                <div className="pt-4">
                  <Button 
                    onClick={handleGenerateOffer}
                    disabled={!offerData.buyerName || !offerData.buyerEmail || generateOfferMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 h-12 text-lg font-semibold"
                  >
                    {generateOfferMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-5 w-5 mr-2" />
                        Generate Smart Offer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Generated Offer */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">Generated Offer Letter</h3>
                {suggestedOffer && (
                  <Button 
                    onClick={downloadOffer} 
                    variant="outline" 
                    size="sm"
                    className="bg-white text-green-600 border-white hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
              <div className="p-6 bg-slate-50 rounded-lg">
                {generateOfferMutation.isPending ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-slate-600">Generating your professional offer letter...</span>
                  </div>
                ) : suggestedOffer ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Offer Letter Generated Successfully
                      </div>
                      <p className="text-sm text-green-700">Your professional offer letter is ready for review and download.</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{suggestedOffer}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center h-64 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mb-4">
                      <Brain className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">Ready to Generate</h4>
                    <p className="text-slate-600 text-sm max-w-md">
                      Fill out the buyer information and click "Generate Smart Offer" to create your professional offer letter with AI-powered market analysis.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}