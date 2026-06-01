import { useState } from 'react';
import { Property } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calculator, TrendingUp, DollarSign, Home, Target, Printer } from 'lucide-react';
import { ScoreBadge } from './score-badge';

interface CalculationBreakdownProps {
  property: Property;
  config?: {
    downPaymentPercent: number;
    closingCostPercent: number;
    loanInterestRate: number;
    loanTermYears: number;
    propertyTaxRate: number;
    monthlyInsuranceEstimate: number;
    monthlyHOAFees: number;
    vacancyRatePercent: number;
    annualAppreciationRate: number;
    principalPaydownEstimatePercent: number;
    scoreWeights: {
      cashOnCashROI: number;
      dscr: number;
      capRate: number;
      fiveYearGain: number;
      equityAtPurchase: number;
    };
  };
}

export function CalculationBreakdown({ property, config }: CalculationBreakdownProps) {
  const [open, setOpen] = useState(false);
  
  const handlePrint = () => {
    // Add a small delay to ensure the dialog renders completely
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Default configuration values
  const defaultConfig = {
    downPaymentPercent: 20,
    closingCostPercent: 3,
    loanInterestRate: 7,
    loanTermYears: 30,
    propertyTaxRate: 1.25,
    monthlyInsuranceEstimate: 100,
    monthlyHOAFees: 0,
    vacancyRatePercent: 5,
    annualAppreciationRate: 3,
    principalPaydownEstimatePercent: 6,
    scoreWeights: {
      cashOnCashROI: 0.3,
      dscr: 0.2,
      capRate: 0.2,
      fiveYearGain: 0.2,
      equityAtPurchase: 0.1
    }
  };

  const cfg = config || defaultConfig;

  // Calculate detailed financial metrics
  const calculateDetailedFinancials = () => {
    const price = Number(property.price) || 0;
    const rentEstimate = Number(property.rentEstimate ?? property.rentZestimate) || 0;
    const zestimate = Number(property.zestimate) || price;
    const taxAssessedValue = Number(property.taxAssessedValue ?? property.taxAssessed) || price * 0.85;

    // Basic calculations
    const downPayment = price * (cfg.downPaymentPercent / 100);
    const closingCosts = price * (cfg.closingCostPercent / 100);
    const loanAmount = price - downPayment;
    const totalCashNeeded = downPayment + closingCosts;

    // Monthly calculations
    const monthlyInterestRate = cfg.loanInterestRate / 100 / 12;
    const numberOfPayments = cfg.loanTermYears * 12;
    const monthlyMortgage = loanAmount > 0 
      ? (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) 
        / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
      : 0;

    const monthlyTaxes = (price * cfg.propertyTaxRate / 100) / 12;
    const monthlyInsurance = cfg.monthlyInsuranceEstimate;
    const monthlyHOA = cfg.monthlyHOAFees;
    const monthlyExpenses = monthlyMortgage + monthlyTaxes + monthlyInsurance + monthlyHOA;
    
    const grossMonthlyIncome = rentEstimate;
    const vacancyAdjustment = grossMonthlyIncome * (1 - cfg.vacancyRatePercent / 100);
    const netMonthlyIncome = vacancyAdjustment;
    const monthlyCashFlow = netMonthlyIncome - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    // Key ratios
    const capRate = price > 0 ? ((rentEstimate * 12 - monthlyTaxes * 12 - monthlyInsurance * 12 - monthlyHOA * 12) / price) * 100 : 0;
    const cashOnCashROI = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0;
    const dscr = monthlyMortgage > 0 ? netMonthlyIncome / monthlyMortgage : 0;
    
    // Long-term projections
    const fiveYearFuturePrice = price * Math.pow(1 + cfg.annualAppreciationRate / 100, 5);
    const fiveYearGain = fiveYearFuturePrice - price;
    const equityAtPurchase = Math.max(zestimate, taxAssessedValue) - price;

    // Normalization (same ranges as server)
    const normalizationRanges: Record<string, [number, number]> = {
      cashOnCashROI: [0, 15],
      dscr: [1, 2],
      capRate: [4, 10],
      fiveYearGain: [0, 100000],
      equityAtPurchase: [0, 50000]
    };

    const normalize = (value: number | null, min: number, max: number): number => {
      if (value === null || value === undefined) return 0;
      return Math.max(0, Math.min(1, (value - min) / (max - min)));
    };

    const normCashROI = normalize(cashOnCashROI, ...normalizationRanges.cashOnCashROI);
    const normDSCR = normalize(dscr, ...normalizationRanges.dscr);
    const normCapRate = normalize(capRate, ...normalizationRanges.capRate);
    const norm5yrGain = normalize(fiveYearGain, ...normalizationRanges.fiveYearGain);
    const normEquity = normalize(equityAtPurchase, ...normalizationRanges.equityAtPurchase);

    // Score calculation
    const weightedScore = 
      normCashROI * cfg.scoreWeights.cashOnCashROI +
      normDSCR * cfg.scoreWeights.dscr +
      normCapRate * cfg.scoreWeights.capRate +
      norm5yrGain * cfg.scoreWeights.fiveYearGain +
      normEquity * cfg.scoreWeights.equityAtPurchase;

    const finalScore = Math.round(weightedScore * 100);

    return {
      // Basic financials
      price, rentEstimate, downPayment, closingCosts, loanAmount, totalCashNeeded,
      monthlyMortgage, monthlyTaxes, monthlyInsurance, monthlyHOA, monthlyExpenses,
      grossMonthlyIncome, vacancyAdjustment, netMonthlyIncome, monthlyCashFlow, annualCashFlow,
      
      // Key ratios
      capRate, cashOnCashROI, dscr, fiveYearFuturePrice, fiveYearGain, equityAtPurchase,
      
      // Normalized values
      normCashROI, normDSCR, normCapRate, norm5yrGain, normEquity, normalizationRanges,
      
      // Score components
      weightedScore, finalScore
    };
  };

  const financials = calculateDetailedFinancials();

  const displayScore = Number(property.investmentScorePercent) || 0;

  const ScoreComponent = ({ 
    title, 
    value, 
    normalizedValue, 
    weight, 
    weightedContribution, 
    range, 
    icon: Icon,
    color 
  }: {
    title: string;
    value: number;
    normalizedValue: number;
    weight: number;
    weightedContribution: number;
    range: [number, number];
    icon: any;
    color: string;
  }) => (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4" style={{ color }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-500">Raw Value</div>
            <div className="font-semibold text-lg">{value.toFixed(2)}{title.includes('%') || title.includes('ROI') || title.includes('Rate') ? '%' : ''}</div>
          </div>
          <div>
            <div className="text-gray-500">Normalized</div>
            <div className="font-semibold text-lg">{(normalizedValue * 100).toFixed(1)}%</div>
          </div>
        </div>
        
        <div>
          <div className="text-gray-500 text-xs mb-1">
            Range: {range[0]} - {range[1]}{title.includes('%') || title.includes('ROI') || title.includes('Rate') ? '%' : ''}
          </div>
          <Progress value={normalizedValue * 100} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-500">Weight</div>
            <div className="font-semibold">{(weight * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-gray-500">Contribution</div>
            <div className="font-semibold">{(weightedContribution * 100).toFixed(2)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          <ScoreBadge investmentScorePercent={displayScore} onClick={() => setOpen(true)} />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        {/* Professional Branded Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <Calculator className="w-8 h-8 text-gray-900" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Investment Score Analysis</h2>
                  <p className="text-gray-300 text-sm">Professional Property Evaluation Report</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handlePrint}
                  variant="outline" 
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white mb-1">ClearEdge</div>
                  <div className="text-sm text-gray-300 font-medium">DEALS</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Score Hero Section */}
          <div className="px-8 pb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-7xl font-bold text-white mb-2 drop-shadow-lg">
                  {displayScore}
                </div>
                <div className="text-xl text-gray-200 mb-1 font-medium">Investment Score</div>
                <div className="text-sm text-gray-300 mb-4">
                  Calculated Score: {financials.finalScore} | Weighted: {(financials.weightedScore * 100).toFixed(2)}%
                </div>
                <div className="max-w-md mx-auto">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Poor (0)</span>
                    <span>Excellent (100)</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-1000 ease-out"
                      style={{ width: `${displayScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-8 space-y-6">

          {/* Property Summary with Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {/* Property Image */}
                <div className="flex-shrink-0">
                  <img
                    src={[property.imgMain].filter(Boolean)[0] || "https://images.unsplash.com/photo-1605146769289-440113cc3d00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"}
                    alt={property.address ?? ''}
                    className="w-32 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                  />
                </div>
                
                {/* Property Details */}
                <div className="flex-1">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{property.address}</h3>
                    <p className="text-gray-600">{property.addressCity}, {property.addressState}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Purchase Price</div>
                      <div className="font-semibold text-lg">${financials.price.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Estimated Rent</div>
                      <div className="font-semibold text-lg">${financials.rentEstimate.toLocaleString()}/mo</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Down Payment</div>
                      <div className="font-semibold text-lg">${financials.downPayment.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Cash Needed</div>
                      <div className="font-semibold text-lg">${financials.totalCashNeeded.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Components */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Score Components
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreComponent
                title="Cash-on-Cash ROI"
                value={financials.cashOnCashROI}
                normalizedValue={financials.normCashROI}
                weight={cfg.scoreWeights.cashOnCashROI}
                weightedContribution={financials.normCashROI * cfg.scoreWeights.cashOnCashROI}
                range={financials.normalizationRanges.cashOnCashROI}
                icon={DollarSign}
                color="#10B981"
              />
              
              <ScoreComponent
                title="Debt Service Coverage Ratio"
                value={financials.dscr}
                normalizedValue={financials.normDSCR}
                weight={cfg.scoreWeights.dscr}
                weightedContribution={financials.normDSCR * cfg.scoreWeights.dscr}
                range={financials.normalizationRanges.dscr}
                icon={TrendingUp}
                color="#3B82F6"
              />
              
              <ScoreComponent
                title="Cap Rate"
                value={financials.capRate}
                normalizedValue={financials.normCapRate}
                weight={cfg.scoreWeights.capRate}
                weightedContribution={financials.normCapRate * cfg.scoreWeights.capRate}
                range={financials.normalizationRanges.capRate}
                icon={Target}
                color="#8B5CF6"
              />
              
              <ScoreComponent
                title="5-Year Appreciation Gain"
                value={financials.fiveYearGain}
                normalizedValue={financials.norm5yrGain}
                weight={cfg.scoreWeights.fiveYearGain}
                weightedContribution={financials.norm5yrGain * cfg.scoreWeights.fiveYearGain}
                range={financials.normalizationRanges.fiveYearGain}
                icon={TrendingUp}
                color="#F59E0B"
              />
              
              <ScoreComponent
                title="Equity at Purchase"
                value={financials.equityAtPurchase}
                normalizedValue={financials.normEquity}
                weight={cfg.scoreWeights.equityAtPurchase}
                weightedContribution={financials.normEquity * cfg.scoreWeights.equityAtPurchase}
                range={financials.normalizationRanges.equityAtPurchase}
                icon={Home}
                color="#EF4444"
              />
            </div>
          </div>

          {/* Monthly Cash Flow Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Monthly Cash Flow Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-semibold text-green-600">Monthly Income</div>
                    <div className="pl-4">
                      <div className="flex justify-between">
                        <span>Gross Rent:</span>
                        <span>${financials.grossMonthlyIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vacancy Adjustment ({cfg.vacancyRatePercent}%):</span>
                        <span>-${(financials.grossMonthlyIncome - financials.vacancyAdjustment).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Net Income:</span>
                        <span>${financials.netMonthlyIncome.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="font-semibold text-red-600">Monthly Expenses</div>
                    <div className="pl-4">
                      <div className="flex justify-between">
                        <span>Mortgage (P&I):</span>
                        <span>${financials.monthlyMortgage.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Property Taxes:</span>
                        <span>${financials.monthlyTaxes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Insurance:</span>
                        <span>${financials.monthlyInsurance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HOA Fees:</span>
                        <span>${financials.monthlyHOA.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total Expenses:</span>
                        <span>${financials.monthlyExpenses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Monthly Cash Flow:</span>
                    <span className={financials.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${financials.monthlyCashFlow.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Annual Cash Flow:</span>
                    <span className={financials.annualCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${financials.annualCashFlow.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}