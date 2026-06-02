import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Calculator, TrendingUp, Building, AlertCircle, Clock, DollarSign, Home } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";

const parseFormattedNumber = (value: string): number => {
  return parseFloat(value.replace(/[,$]/g, '')) || 0;
};

const handleNumberInput = (value: string, setter: (num: number) => void) => {
  const numericValue = parseFormattedNumber(value);
  setter(numericValue);
};

interface HoldVsFlipInputs {
  purchasePrice: number;
  rehabCost: number;
  afterRepairValue: number;
  holdPeriod: number;
  monthlyRent: number;
  monthlyExpenses: number;
  propertyTaxes: number;
  sellingFees: number;
}

interface ExchangeInputs {
  salePrice: number;
  saleDate: string;
  replacementTimeline: number;
}

interface RefinanceInputs {
  currentValue: number;
  ltvLimit: number;
  mortgageBalance: number;
  interestRate: number;
  loanTerm: number;
}

export default function EquityToolkitPage() {
  const [activeTab, setActiveTab] = useState("hold-vs-flip");
  
  // Hold vs Flip Calculator State
  const [holdFlipInputs, setHoldFlipInputs] = useState<HoldVsFlipInputs>({
    purchasePrice: 200000,
    rehabCost: 50000,
    afterRepairValue: 300000,
    holdPeriod: 5,
    monthlyRent: 2500,
    monthlyExpenses: 800,
    propertyTaxes: 3600,
    sellingFees: 6
  });
  
  // 1031 Exchange State
  const [exchangeInputs, setExchangeInputs] = useState<ExchangeInputs>({
    salePrice: 500000,
    saleDate: "",
    replacementTimeline: 180
  });
  
  // Refinance State
  const [refinanceInputs, setRefinanceInputs] = useState<RefinanceInputs>({
    currentValue: 400000,
    ltvLimit: 75,
    mortgageBalance: 200000,
    interestRate: 6.5,
    loanTerm: 30
  });

  // Hold vs Flip Calculations
  const calculateHoldVsFlip = () => {
    const totalInvestment = holdFlipInputs.purchasePrice + holdFlipInputs.rehabCost;
    
    // Flip Calculations
    const flipProfit = holdFlipInputs.afterRepairValue - totalInvestment - (holdFlipInputs.afterRepairValue * holdFlipInputs.sellingFees / 100);
    const flipROI = (flipProfit / totalInvestment) * 100;
    
    // Hold Calculations
    const annualNetIncome = (holdFlipInputs.monthlyRent - holdFlipInputs.monthlyExpenses) * 12 - holdFlipInputs.propertyTaxes;
    const totalRentalIncome = annualNetIncome * holdFlipInputs.holdPeriod;
    const appreciationRate = 0.03; // 3% annual appreciation assumption
    const futureValue = holdFlipInputs.afterRepairValue * Math.pow(1 + appreciationRate, holdFlipInputs.holdPeriod);
    const holdSaleProfit = futureValue - totalInvestment - (futureValue * holdFlipInputs.sellingFees / 100);
    const totalHoldProfit = totalRentalIncome + holdSaleProfit;
    const holdROI = (totalHoldProfit / totalInvestment) * 100;
    const annualizedHoldROI = holdROI / holdFlipInputs.holdPeriod;
    
    return {
      flip: { profit: flipProfit, roi: flipROI },
      hold: { profit: totalHoldProfit, roi: holdROI, annualized: annualizedHoldROI },
      totalInvestment,
      futureValue,
      annualNetIncome
    };
  };

  // 1031 Exchange Calculations
  const calculate1031Exchange = () => {
    if (!exchangeInputs.saleDate) return null;
    
    const saleDate = new Date(exchangeInputs.saleDate);
    const today = new Date();
    const daysSinceSale = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const days45Remaining = 45 - daysSinceSale;
    const days180Remaining = 180 - daysSinceSale;
    
    return {
      daysSinceSale,
      days45Remaining: Math.max(0, days45Remaining),
      days180Remaining: Math.max(0, days180Remaining),
      deadline45: new Date(saleDate.getTime() + 45 * 24 * 60 * 60 * 1000),
      deadline180: new Date(saleDate.getTime() + 180 * 24 * 60 * 60 * 1000),
      isEligible: days180Remaining > 0
    };
  };

  // Refinance Calculations
  const calculateRefinance = () => {
    const maxLoanAmount = (refinanceInputs.currentValue * refinanceInputs.ltvLimit) / 100;
    const availableCashOut = maxLoanAmount - refinanceInputs.mortgageBalance;
    
    // Monthly payment calculation
    const monthlyRate = refinanceInputs.interestRate / 100 / 12;
    const numPayments = refinanceInputs.loanTerm * 12;
    const monthlyPayment = maxLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return {
      maxLoanAmount,
      availableCashOut: Math.max(0, availableCashOut),
      monthlyPayment,
      currentEquity: refinanceInputs.currentValue - refinanceInputs.mortgageBalance,
      ltvRatio: (refinanceInputs.mortgageBalance / refinanceInputs.currentValue) * 100
    };
  };

  const holdFlipResults = calculateHoldVsFlip();
  const exchangeResults = calculate1031Exchange();
  const refinanceResults = calculateRefinance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Real Estate Investment Toolkit
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Analyze equity strategies and make informed investment decisions with professional-grade calculators
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="hold-vs-flip" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Hold vs. Flip
            </TabsTrigger>
            <TabsTrigger value="1031-exchange" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              1031 Exchange
            </TabsTrigger>
            <TabsTrigger value="refinance" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Cash-Out Refi
            </TabsTrigger>
          </TabsList>

          {/* Hold vs Flip Calculator */}
          <TabsContent value="hold-vs-flip">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Property Details
                  </CardTitle>
                  <CardDescription>
                    Enter your property investment details to compare strategies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="purchasePrice">Purchase Price</Label>
                      <Input
                        id="purchasePrice"
                        type="text"
                        value={formatNumber(holdFlipInputs.purchasePrice)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setHoldFlipInputs({...holdFlipInputs, purchasePrice: value}))}
                        placeholder="200,000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rehabCost">Rehab Cost</Label>
                      <Input
                        id="rehabCost"
                        type="text"
                        value={formatNumber(holdFlipInputs.rehabCost)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setHoldFlipInputs({...holdFlipInputs, rehabCost: value}))}
                        placeholder="50,000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="afterRepairValue">After Repair Value (ARV)</Label>
                      <Input
                        id="afterRepairValue"
                        type="text"
                        value={formatNumber(holdFlipInputs.afterRepairValue)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setHoldFlipInputs({...holdFlipInputs, afterRepairValue: value}))}
                        placeholder="300,000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="holdPeriod">Hold Period (Years)</Label>
                      <Input
                        id="holdPeriod"
                        type="number"
                        value={holdFlipInputs.holdPeriod}
                        onChange={(e) => setHoldFlipInputs({...holdFlipInputs, holdPeriod: Number(e.target.value)})}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyRent">Monthly Rent</Label>
                      <Input
                        id="monthlyRent"
                        type="text"
                        value={formatNumber(holdFlipInputs.monthlyRent)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setHoldFlipInputs({...holdFlipInputs, monthlyRent: value}))}
                        placeholder="2,500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyExpenses">Monthly Expenses</Label>
                      <Input
                        id="monthlyExpenses"
                        type="text"
                        value={formatNumber(holdFlipInputs.monthlyExpenses)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setHoldFlipInputs({...holdFlipInputs, monthlyExpenses: value}))}
                        placeholder="800"
                      />
                    </div>
                    <div>
                      <Label htmlFor="propertyTaxes">Annual Property Taxes</Label>
                      <Input
                        id="propertyTaxes"
                        type="text"
                        value={formatNumber(holdFlipInputs.propertyTaxes)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setHoldFlipInputs({...holdFlipInputs, propertyTaxes: value}))}
                        placeholder="3,600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellingFees">Selling Fees (%)</Label>
                      <Input
                        id="sellingFees"
                        type="number"
                        value={holdFlipInputs.sellingFees}
                        onChange={(e) => setHoldFlipInputs({...holdFlipInputs, sellingFees: Number(e.target.value)})}
                        placeholder="6"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Investment Analysis
                  </CardTitle>
                  <CardDescription>
                    Compare flip vs. hold strategy returns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Flip Strategy</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Profit:</span>
                          <span className="font-medium">${holdFlipResults.flip.profit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ROI:</span>
                          <span className="font-medium">{holdFlipResults.flip.roi.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Hold Strategy</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Profit:</span>
                          <span className="font-medium">${holdFlipResults.hold.profit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total ROI:</span>
                          <span className="font-medium">{holdFlipResults.hold.roi.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Annualized ROI:</span>
                          <span className="font-medium">{holdFlipResults.hold.annualized.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Key Metrics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Investment:</span>
                        <span className="font-medium">${holdFlipResults.totalInvestment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Future Value:</span>
                        <span className="font-medium">${holdFlipResults.futureValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Annual Net Income:</span>
                        <span className="font-medium">${holdFlipResults.annualNetIncome.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {holdFlipResults.hold.annualized > holdFlipResults.flip.roi 
                        ? "Hold strategy shows better annualized returns" 
                        : "Flip strategy shows higher immediate returns"}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 1031 Exchange */}
          <TabsContent value="1031-exchange">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    1031 Exchange Details
                  </CardTitle>
                  <CardDescription>
                    Track your like-kind exchange timeline and requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="salePrice">Sale Price</Label>
                    <Input
                      id="salePrice"
                      type="text"
                      value={formatNumber(exchangeInputs.salePrice)}
                      onChange={(e) => handleNumberInput(e.target.value, (value) => setExchangeInputs({...exchangeInputs, salePrice: value}))}
                      placeholder="500,000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="saleDate">Sale Date</Label>
                    <Input
                      id="saleDate"
                      type="date"
                      value={exchangeInputs.saleDate}
                      onChange={(e) => setExchangeInputs({...exchangeInputs, saleDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="replacementTimeline">Replacement Timeline (Days)</Label>
                    <Input
                      id="replacementTimeline"
                      type="number"
                      value={exchangeInputs.replacementTimeline}
                      onChange={(e) => setExchangeInputs({...exchangeInputs, replacementTimeline: Number(e.target.value)})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Exchange Timeline
                  </CardTitle>
                  <CardDescription>
                    Critical IRS deadlines and progress tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {exchangeResults ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">45-Day Identification Period</span>
                          <Badge variant={exchangeResults.days45Remaining > 0 ? "default" : "destructive"}>
                            {exchangeResults.days45Remaining > 0 ? `${exchangeResults.days45Remaining} days left` : "Expired"}
                          </Badge>
                        </div>
                        <Progress value={Math.max(0, Math.min(100, ((45 - exchangeResults.days45Remaining) / 45) * 100))} />
                        
                        <div className="flex items-center justify-between">
                          <span className="font-medium">180-Day Exchange Period</span>
                          <Badge variant={exchangeResults.days180Remaining > 0 ? "default" : "destructive"}>
                            {exchangeResults.days180Remaining > 0 ? `${exchangeResults.days180Remaining} days left` : "Expired"}
                          </Badge>
                        </div>
                        <Progress value={Math.max(0, Math.min(100, ((180 - exchangeResults.days180Remaining) / 180) * 100))} />
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="font-semibold">Key Dates</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">45-Day Deadline:</span>
                            <span className="font-medium">{exchangeResults.deadline45.toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">180-Day Deadline:</span>
                            <span className="font-medium">{exchangeResults.deadline180.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {exchangeResults.isEligible 
                            ? "Exchange is still eligible. Act quickly to meet deadlines." 
                            : "Exchange period has expired. Consult your tax advisor."}
                        </AlertDescription>
                      </Alert>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Enter a sale date to see your 1031 exchange timeline
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 1031 Exchange FAQ */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>1031 Exchange Requirements</CardTitle>
                <CardDescription>What qualifies for a like-kind exchange</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-green-800">✓ Qualifying Properties</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Investment or business real estate</li>
                      <li>• Rental properties</li>
                      <li>• Commercial buildings</li>
                      <li>• Land held for investment</li>
                      <li>• Industrial properties</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-red-800">✗ Non-Qualifying Properties</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Primary residence</li>
                      <li>• Vacation homes (personal use)</li>
                      <li>• Properties held for resale</li>
                      <li>• Stock or securities</li>
                      <li>• Personal property</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash-Out Refinance */}
          <TabsContent value="refinance">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Refinance Details
                  </CardTitle>
                  <CardDescription>
                    Calculate available equity and new loan terms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currentValue">Current Property Value</Label>
                      <Input
                        id="currentValue"
                        type="text"
                        value={formatNumber(refinanceInputs.currentValue)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setRefinanceInputs({...refinanceInputs, currentValue: value}))}
                        placeholder="400,000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ltvLimit">LTV Limit (%)</Label>
                      <Input
                        id="ltvLimit"
                        type="number"
                        value={refinanceInputs.ltvLimit}
                        onChange={(e) => setRefinanceInputs({...refinanceInputs, ltvLimit: Number(e.target.value)})}
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mortgageBalance">Current Mortgage Balance</Label>
                      <Input
                        id="mortgageBalance"
                        type="text"
                        value={formatNumber(refinanceInputs.mortgageBalance)}
                        onChange={(e) => handleNumberInput(e.target.value, (value) => setRefinanceInputs({...refinanceInputs, mortgageBalance: value}))}
                        placeholder="200,000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.1"
                        value={refinanceInputs.interestRate}
                        onChange={(e) => setRefinanceInputs({...refinanceInputs, interestRate: Number(e.target.value)})}
                        placeholder="6.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="loanTerm">Loan Term (Years)</Label>
                      <Input
                        id="loanTerm"
                        type="number"
                        value={refinanceInputs.loanTerm}
                        onChange={(e) => setRefinanceInputs({...refinanceInputs, loanTerm: Number(e.target.value)})}
                        placeholder="30"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Cash-Out Analysis
                  </CardTitle>
                  <CardDescription>
                    Available equity and new payment structure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">Available Cash-Out</h4>
                    <div className="text-3xl font-bold text-green-800">
                      ${refinanceResults.availableCashOut.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Current Equity</div>
                      <div className="font-semibold">${refinanceResults.currentEquity.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Current LTV</div>
                      <div className="font-semibold">{refinanceResults.ltvRatio.toFixed(1)}%</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">New Loan Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Loan Amount:</span>
                        <span className="font-medium">${refinanceResults.maxLoanAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New Monthly Payment:</span>
                        <span className="font-medium">${refinanceResults.monthlyPayment.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Consult with your lender for final figures. Rates and terms may vary based on credit and property type.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Reinvestment Planner */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Reinvestment Opportunities</CardTitle>
                <CardDescription>Potential uses for your cash-out equity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Down Payment Strategy</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Use 20-25% down payments to acquire multiple properties
                    </p>
                    <div className="text-lg font-bold text-blue-800">
                      {Math.floor(refinanceResults.availableCashOut / 50000)} properties
                    </div>
                    <div className="text-xs text-gray-600">at ${(50000).toLocaleString()} down each</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Fix & Flip Capital</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Fund renovation projects for quick returns
                    </p>
                    <div className="text-lg font-bold text-green-800">
                      {Math.floor(refinanceResults.availableCashOut / 75000)} projects
                    </div>
                    <div className="text-xs text-gray-600">at ${(75000).toLocaleString()} each</div>
                  </div>
                  
                  <div className="bg-brand-light p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">REIT Investment</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Diversify with real estate investment trusts
                    </p>
                    <div className="text-lg font-bold text-purple-800">
                      ${(refinanceResults.availableCashOut * 0.06).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">annual income at 6% yield</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}