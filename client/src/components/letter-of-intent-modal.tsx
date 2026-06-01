import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

interface LetterOfIntentModalProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LoiData {
  purchasePrice: string;
  downPayment: string;
  financingAmount: string;
  inspectionPeriod: string;
  closingDate: string;
  earnestMoney: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  additionalTerms: string;
}

export function LetterOfIntentModal({ property, open, onOpenChange }: LetterOfIntentModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'generated'>('form');
  const [generatedLetter, setGeneratedLetter] = useState<string>('');
  
  const [formData, setFormData] = useState<LoiData>({
    purchasePrice: property.price ?? '',
    downPayment: '20',
    financingAmount: '',
    inspectionPeriod: '14',
    closingDate: '',
    earnestMoney: '5000',
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    additionalTerms: ''
  });

  const generateLoiMutation = useMutation({
    mutationFn: async (data: LoiData & { property: Property }) => {
      const response = await apiRequest("POST", "/api/generate-loi", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedLetter(data.letter);
      setStep('generated');
      toast({
        title: "Letter of Intent Generated",
        description: "Your professional letter of intent has been created using AI.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Unable to generate letter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatNumberWithCommas = (value: string): string => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    const number = parseFloat(numericValue);
    
    if (isNaN(number)) return '';
    
    // Format with commas
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const parseFormattedNumber = (value: string): string => {
    // Remove commas and return just the numeric value
    return value.replace(/,/g, '');
  };

  const handleInputChange = (field: keyof LoiData, value: string) => {
    let processedValue = value;
    
    // For financial fields, store the raw number but display with formatting
    if (['purchasePrice', 'financingAmount', 'earnestMoney'].includes(field)) {
      processedValue = parseFormattedNumber(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Auto-calculate financing amount
    if (field === 'purchasePrice' || field === 'downPayment') {
      const price = parseFloat(field === 'purchasePrice' ? processedValue : formData.purchasePrice) || 0;
      const downPercent = parseFloat(field === 'downPayment' ? value : formData.downPayment) || 0;
      const financing = price - (price * downPercent / 100);
      setFormData(prev => ({ 
        ...prev, 
        [field]: processedValue,
        financingAmount: financing.toFixed(0)
      }));
    }
  };

  const handleGenerate = () => {
    generateLoiMutation.mutate({ ...formData, property });
  };

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast({
      title: "Copied!",
      description: "Letter copied to clipboard.",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOI-${(property.address ?? property.zpid).replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep('form');
    setGeneratedLetter('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 'form' ? 'Generate Letter of Intent' : 'Your Letter of Intent'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' 
              ? 'Fill out the details below to generate a professional Letter of Intent for this property.'
              : 'Your AI-generated Letter of Intent is ready. You can copy or download it below.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-6">
            {/* Property Info */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Property Details</h3>
              <p className="text-sm text-slate-600">{property.address ?? property.fullAddress}, {property.addressCity}, {property.addressState}</p>
              <p className="text-sm font-medium text-slate-700">Listed Price: ${Number(property.price ?? 0).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Purchase Terms */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Purchase Terms</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Offer Price ($)</Label>
                  <Input
                    id="purchasePrice"
                    type="text"
                    value={formData.purchasePrice ? formatNumberWithCommas(formData.purchasePrice) : ''}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    placeholder="Purchase price"
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="downPayment">Down Payment (%)</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    value={formData.downPayment}
                    onChange={(e) => handleInputChange('downPayment', e.target.value)}
                    placeholder="20"
                    className="text-right"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financingAmount">Financing Amount ($)</Label>
                  <Input
                    id="financingAmount"
                    type="text"
                    value={formData.financingAmount ? formatNumberWithCommas(formData.financingAmount) : ''}
                    readOnly
                    className="bg-slate-50 text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="earnestMoney">Earnest Money ($)</Label>
                  <Input
                    id="earnestMoney"
                    type="text"
                    value={formData.earnestMoney ? formatNumberWithCommas(formData.earnestMoney) : ''}
                    onChange={(e) => handleInputChange('earnestMoney', e.target.value)}
                    placeholder="5,000"
                    className="text-right"
                  />
                </div>
              </div>

              {/* Timeline & Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Timeline & Contact</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="inspectionPeriod">Inspection Period (days)</Label>
                  <Input
                    id="inspectionPeriod"
                    type="number"
                    value={formData.inspectionPeriod}
                    onChange={(e) => handleInputChange('inspectionPeriod', e.target.value)}
                    placeholder="14"
                    className="text-right"
                    min="1"
                    max="90"
                    step="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closingDate">Preferred Closing Date</Label>
                  <Input
                    id="closingDate"
                    type="date"
                    value={formData.closingDate}
                    onChange={(e) => handleInputChange('closingDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyerName">Your Full Name</Label>
                  <Input
                    id="buyerName"
                    value={formData.buyerName}
                    onChange={(e) => handleInputChange('buyerName', e.target.value)}
                    placeholder="John Smith"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyerEmail">Email Address</Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) => handleInputChange('buyerEmail', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyerPhone">Phone Number</Label>
                  <Input
                    id="buyerPhone"
                    value={formData.buyerPhone}
                    onChange={(e) => handleInputChange('buyerPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalTerms">Additional Terms or Conditions</Label>
              <Textarea
                id="additionalTerms"
                value={formData.additionalTerms}
                onChange={(e) => handleInputChange('additionalTerms', e.target.value)}
                placeholder="Any additional terms, contingencies, or special conditions..."
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={generateLoiMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generateLoiMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Letter
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleReset}>
                ← Edit Details
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleCopyLetter}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {generatedLetter}
              </pre>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}