// Property scoring system based on provided configuration
export interface ScoringConfig {
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
  normalizationRanges: {
    cashOnCashROI: [number, number];
    dscr: [number, number];
    capRate: [number, number];
    fiveYearGain: [number, number];
    equityAtPurchase: [number, number];
  };
}

export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipcode: string;
  homeType: string;
  price: number;
  rentEstimate: number;
  zestimate: number;
  taxAssessedValue: number;
  sizeSqFt: number;
  zpid: string;
  numBeds: number;
  numBaths: number;
  yearBuilt: number;
  url: string;
  listingStatus: string;
  daysOnZillow: number;
  isForeclosure: boolean;
  isNewConstruction: boolean;
  images: string[];
  brokerName?: string;
}

export interface FinancialMetrics {
  downPayment: number;
  closingCosts: number;
  totalCashNeeded: number;
  loanAmount: number;
  monthlyMortgage: number;
  monthlyTaxes: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRatePercent: number;
  grossRentMultiplier: number;
  cashOnCashROI: number;
  dscr: number;
  principalPaidFirstYear: number;
  fiveYearFuturePrice: number;
  fiveYearGain: number;
  equityAtPurchase: number;
  breakevenRent: number;
  annualNOI: number;
  grossYieldPercent: number;
  rentToPriceRatio: number;
  valueToTaxRatio: number;
  cashFlowPerSqFt: number;
  pricePerSqFt: number;
  marketCategory: string;
  isCashFlowNegative: boolean;
  isRentEstimateMissing: boolean;
  isBelowZestimate: boolean;
  isBelowTaxAssessed: boolean;
}

export interface ScoredProperty extends PropertyData {
  score: number;
  estimatedRoi: string;
  metrics: FinancialMetrics;
}

// Default configuration matching your attached file
export const DEFAULT_CONFIG: ScoringConfig = {
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
    cashOnCashROI: 0.30,
    dscr: 0.20,
    capRate: 0.20,
    fiveYearGain: 0.20,
    equityAtPurchase: 0.10
  },
  normalizationRanges: {
    cashOnCashROI: [0, 15],
    dscr: [1, 2],
    capRate: [4, 10],
    fiveYearGain: [0, 100000],
    equityAtPurchase: [0, 50000]
  }
};

export class PropertyScorer {
  private config: ScoringConfig;

  constructor(config: ScoringConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  // Helper functions
  private parseSqFt(sizeStr: string | number): number {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    if (sizeStr.toString().includes("acres")) return parseFloat(sizeStr.toString()) * 43560;
    return parseFloat(sizeStr.toString().replace(/[^\d.]/g, '')) || 0;
  }

  private normalize(value: number | null, min: number, max: number): number {
    if (value === null || isNaN(value)) return 0;
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  private calculateMonthlyMortgage(principal: number, annualInterestRate: number, loanTermYears: number): number {
    if (principal <= 0 || loanTermYears <= 0) return 0;
    const monthlyInterestRate = annualInterestRate / 12;
    const totalPayments = loanTermYears * 12;
    return monthlyInterestRate === 0
      ? principal / totalPayments
      : principal * monthlyInterestRate / (1 - Math.pow(1 + monthlyInterestRate, -totalPayments));
  }

  private categorizeMarket(price: number): string {
    if (price < 100000) return "Budget (<$100k)";
    if (price < 300000) return "Entry ($100k–$300k)";
    if (price < 600000) return "Mid-Tier ($300k–$600k)";
    return "Luxury ($600k+)";
  }

  private calculateFinancials(property: PropertyData): FinancialMetrics {
    const cfg = this.config;
    const downPayment = (cfg.downPaymentPercent / 100) * property.price;
    const closingCosts = (cfg.closingCostPercent / 100) * property.price;
    const loanAmount = property.price - downPayment;

    const monthlyMortgage = this.calculateMonthlyMortgage(
      loanAmount, cfg.loanInterestRate / 100, cfg.loanTermYears
    );

    const monthlyTaxes = (cfg.propertyTaxRate / 100 * property.price) / 12;
    const monthlyExpenses = monthlyMortgage + monthlyTaxes + cfg.monthlyInsuranceEstimate + cfg.monthlyHOAFees;
    const monthlyCashFlow = property.rentEstimate - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    const totalCashNeeded = downPayment + closingCosts;

    const capRatePercent = property.price > 0 ? ((property.rentEstimate * 12 - monthlyTaxes * 12) / property.price) * 100 : 0;
    const grossRentMultiplier = property.rentEstimate > 0 ? property.price / (property.rentEstimate * 12) : 0;
    const cashOnCashROI = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0;
    const dscr = monthlyMortgage > 0 ? property.rentEstimate / monthlyMortgage : 0;

    const principalPaidFirstYear = loanAmount * (cfg.principalPaydownEstimatePercent / 100);
    const fiveYearFuturePrice = property.price * Math.pow(1 + cfg.annualAppreciationRate / 100, 5);
    const fiveYearGain = fiveYearFuturePrice - property.price;
    const equityAtPurchase = Math.max(property.zestimate || 0, property.taxAssessedValue || 0) - property.price;

    // Additional metrics
    const breakevenRent = monthlyExpenses;
    const annualNOI = (property.rentEstimate * 12) - (monthlyTaxes * 12 + cfg.monthlyInsuranceEstimate * 12 + cfg.monthlyHOAFees * 12);
    const grossYieldPercent = property.price > 0 ? (property.rentEstimate * 12 / property.price) * 100 : 0;
    const rentToPriceRatio = property.price > 0 ? property.rentEstimate / property.price : 0;
    const valueToTaxRatio = property.taxAssessedValue > 0 ? (property.zestimate || 0) / property.taxAssessedValue : 0;
    const cashFlowPerSqFt = property.sizeSqFt > 0 ? monthlyCashFlow / property.sizeSqFt : 0;
    const pricePerSqFt = property.sizeSqFt > 0 ? property.price / property.sizeSqFt : 0;

    return {
      downPayment: +downPayment.toFixed(2),
      closingCosts: +closingCosts.toFixed(2),
      totalCashNeeded: +totalCashNeeded.toFixed(2),
      loanAmount: +loanAmount.toFixed(2),
      monthlyMortgage: +monthlyMortgage.toFixed(2),
      monthlyTaxes: +monthlyTaxes.toFixed(2),
      monthlyExpenses: +monthlyExpenses.toFixed(2),
      monthlyCashFlow: +monthlyCashFlow.toFixed(2),
      annualCashFlow: +annualCashFlow.toFixed(2),
      capRatePercent: +capRatePercent.toFixed(2),
      grossRentMultiplier: +grossRentMultiplier.toFixed(2),
      cashOnCashROI: +cashOnCashROI.toFixed(2),
      dscr: +dscr.toFixed(2),
      principalPaidFirstYear: +principalPaidFirstYear.toFixed(2),
      fiveYearFuturePrice: +fiveYearFuturePrice.toFixed(2),
      fiveYearGain: +fiveYearGain.toFixed(2),
      equityAtPurchase: +equityAtPurchase.toFixed(2),
      breakevenRent: +breakevenRent.toFixed(2),
      annualNOI: +annualNOI.toFixed(2),
      grossYieldPercent: +grossYieldPercent.toFixed(2),
      rentToPriceRatio: +rentToPriceRatio.toFixed(4),
      valueToTaxRatio: +valueToTaxRatio.toFixed(2),
      cashFlowPerSqFt: +cashFlowPerSqFt.toFixed(2),
      pricePerSqFt: +pricePerSqFt.toFixed(2),
      marketCategory: this.categorizeMarket(property.price),
      isCashFlowNegative: monthlyCashFlow < 0,
      isRentEstimateMissing: !property.rentEstimate || property.rentEstimate <= 0,
      isBelowZestimate: property.zestimate > 0 ? property.price < property.zestimate : false,
      isBelowTaxAssessed: property.taxAssessedValue > 0 ? property.price < property.taxAssessedValue : false
    };
  }

  private calculateInvestmentScore(metrics: FinancialMetrics): number {
    const { scoreWeights: w, normalizationRanges: r } = this.config;

    const normCashROI = this.normalize(metrics.cashOnCashROI, ...r.cashOnCashROI);
    const normDSCR = this.normalize(metrics.dscr, ...r.dscr);
    const normCapRate = this.normalize(metrics.capRatePercent, ...r.capRate);
    const norm5yrGain = this.normalize(metrics.fiveYearGain, ...r.fiveYearGain);
    const normEquity = this.normalize(metrics.equityAtPurchase, ...r.equityAtPurchase);

    const score = (
      normCashROI * w.cashOnCashROI +
      normDSCR * w.dscr +
      normCapRate * w.capRate +
      norm5yrGain * w.fiveYearGain +
      normEquity * w.equityAtPurchase
    );

    return Math.round(score * 100);
  }

  // Main scoring method
  scoreProperty(property: PropertyData): ScoredProperty {
    const metrics = this.calculateFinancials(property);
    const score = this.calculateInvestmentScore(metrics);
    
    return {
      ...property,
      score,
      estimatedRoi: metrics.cashOnCashROI.toFixed(2),
      metrics
    };
  }

  // Score multiple properties
  scoreProperties(properties: PropertyData[]): ScoredProperty[] {
    return properties.map(property => this.scoreProperty(property));
  }

  // Update scoring configuration
  updateConfig(newConfig: Partial<ScoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): ScoringConfig {
    return { ...this.config };
  }
}

export const propertyScorer = new PropertyScorer();