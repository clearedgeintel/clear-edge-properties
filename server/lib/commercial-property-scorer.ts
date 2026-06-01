import { LoopNetProperty } from './loopnet-api';

export interface CommercialPropertyData {
  price: number;
  sqft: number;
  noi?: number;
  capRate?: number;
  pricePerSqft: number;
  propertyType: string;
  yearBuilt?: number;
  location: {
    city: string;
    state: string;
  };
  parking?: number;
  tenants?: Array<{
    name: string;
    sqft: number;
    rent: number;
    leaseExpiry: string;
  }>;
}

export interface CommercialScoredProperty extends LoopNetProperty {
  score: number;
  estimatedRoi: string;
  metrics: CommercialPropertyMetrics;
}

export interface CommercialPropertyMetrics {
  capRate: number;
  noi: number;
  pricePerSqft: number;
  cashOnCashROI: number;
  dscr: number;
  occupancyRate: number;
  averageLeaseLength: number;
  tenantDiversification: number;
  marketCategory: string;
  isHighCapRate: boolean;
  isUndervalued: boolean;
  hasStableIncome: boolean;
  locationScore: number;
  propertyConditionScore: number;
  valueScore: number;
  incomeScore: number;
  stabilityScore: number;
}

export class CommercialPropertyScorer {
  private config = {
    financing: {
      downPaymentPercent: 25, // Commercial properties typically require 25% down
      interestRate: 6.5, // Current commercial rates
      loanTermYears: 20, // Typical commercial loan term
    },
    assumptions: {
      vacancyRate: 10, // 10% vacancy assumption
      managementFee: 5, // 5% of gross income
      maintenanceReserve: 3, // 3% of gross income
      capExReserve: 2, // 2% of gross income
    },
    scoring: {
      weights: {
        capRate: 25,
        cashFlow: 20,
        location: 15,
        tenantStability: 15,
        propertyCondition: 10,
        value: 10,
        diversification: 5,
      },
      capRateRanges: {
        excellent: { min: 8, max: 100 },
        good: { min: 6, max: 8 },
        fair: { min: 4, max: 6 },
        poor: { min: 0, max: 4 },
      },
    },
  };

  scoreProperty(property: LoopNetProperty): CommercialScoredProperty {
    const propertyData = this.convertToPropertyData(property);
    const metrics = this.calculateMetrics(propertyData);
    const score = this.calculateOverallScore(metrics, propertyData);
    
    return {
      ...property,
      score: Math.round(score),
      estimatedRoi: (metrics.cashOnCashROI * 100).toFixed(2),
      metrics,
    };
  }

  scoreProperties(properties: LoopNetProperty[]): CommercialScoredProperty[] {
    return properties.map(property => this.scoreProperty(property));
  }

  private convertToPropertyData(property: LoopNetProperty): CommercialPropertyData {
    return {
      price: property.price || 0,
      sqft: property.sqft || 0,
      noi: property.noi,
      capRate: property.capRate,
      pricePerSqft: property.pricePerSqft || 0,
      propertyType: property.propertyType || 'Commercial',
      yearBuilt: property.yearBuilt,
      location: {
        city: property.address.city || '',
        state: property.address.state || '',
      },
      parking: property.parking,
      tenants: [],
    };
  }

  private calculateMetrics(property: CommercialPropertyData): CommercialPropertyMetrics {
    const noi = this.calculateNOI(property);
    const capRate = property.price > 0 ? (noi / property.price) * 100 : 0;
    const cashOnCashROI = this.calculateCashOnCashROI(property, noi);
    const dscr = this.calculateDSCR(property, noi);
    
    return {
      capRate,
      noi,
      pricePerSqft: property.pricePerSqft || (property.price / property.sqft) || 0,
      cashOnCashROI,
      dscr,
      occupancyRate: this.calculateOccupancyRate(property),
      averageLeaseLength: this.calculateAverageLeaseLength(property),
      tenantDiversification: this.calculateTenantDiversification(property),
      marketCategory: this.categorizeByPrice(property.price),
      isHighCapRate: capRate >= this.config.scoring.capRateRanges.good.min,
      isUndervalued: this.isUndervalued(property),
      hasStableIncome: this.hasStableIncome(property),
      locationScore: this.calculateLocationScore(property),
      propertyConditionScore: this.calculatePropertyConditionScore(property),
      valueScore: this.calculateValueScore(property),
      incomeScore: this.calculateIncomeScore(capRate, noi),
      stabilityScore: this.calculateStabilityScore(property),
    };
  }

  private calculateNOI(property: CommercialPropertyData): number {
    if (property.noi) return property.noi;
    
    // Estimate NOI if not provided
    if (property.tenants && property.tenants.length > 0) {
      const grossIncome = property.tenants.reduce((sum, tenant) => sum + (tenant.rent * 12), 0);
      const effectiveIncome = grossIncome * (1 - this.config.assumptions.vacancyRate / 100);
      const expenses = effectiveIncome * (
        (this.config.assumptions.managementFee + 
         this.config.assumptions.maintenanceReserve + 
         this.config.assumptions.capExReserve) / 100
      );
      return effectiveIncome - expenses;
    }
    
    // Fallback calculation based on cap rate if available
    if (property.capRate && property.price) {
      return (property.capRate / 100) * property.price;
    }
    
    return 0;
  }

  private calculateCashOnCashROI(property: CommercialPropertyData, noi: number): number {
    const downPayment = property.price * (this.config.financing.downPaymentPercent / 100);
    const loanAmount = property.price - downPayment;
    const monthlyPayment = this.calculateMonthlyPayment(
      loanAmount,
      this.config.financing.interestRate / 100,
      this.config.financing.loanTermYears
    );
    const annualDebtService = monthlyPayment * 12;
    const cashFlow = noi - annualDebtService;
    
    return downPayment > 0 ? cashFlow / downPayment : 0;
  }

  private calculateDSCR(property: CommercialPropertyData, noi: number): number {
    const loanAmount = property.price * (1 - this.config.financing.downPaymentPercent / 100);
    const monthlyPayment = this.calculateMonthlyPayment(
      loanAmount,
      this.config.financing.interestRate / 100,
      this.config.financing.loanTermYears
    );
    const annualDebtService = monthlyPayment * 12;
    
    return annualDebtService > 0 ? noi / annualDebtService : 0;
  }

  private calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
    const monthlyRate = annualRate / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) return principal / numPayments;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  private calculateOccupancyRate(property: CommercialPropertyData): number {
    if (!property.tenants || property.tenants.length === 0) {
      return 90; // Assume 90% for unknown
    }
    
    const occupiedSqft = property.tenants.reduce((sum, tenant) => sum + tenant.sqft, 0);
    return property.sqft > 0 ? (occupiedSqft / property.sqft) * 100 : 0;
  }

  private calculateAverageLeaseLength(property: CommercialPropertyData): number {
    if (!property.tenants || property.tenants.length === 0) return 0;
    
    const currentDate = new Date();
    const leaseLengths = property.tenants.map(tenant => {
      const expiryDate = new Date(tenant.leaseExpiry);
      return Math.max(0, (expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    });
    
    return leaseLengths.reduce((sum, length) => sum + length, 0) / leaseLengths.length;
  }

  private calculateTenantDiversification(property: CommercialPropertyData): number {
    if (!property.tenants || property.tenants.length <= 1) return 0;
    
    const totalRent = property.tenants.reduce((sum, tenant) => sum + tenant.rent, 0);
    if (totalRent === 0) return 0;
    
    // Calculate Herfindahl index for diversification
    const concentrations = property.tenants.map(tenant => tenant.rent / totalRent);
    const herfindahl = concentrations.reduce((sum, conc) => sum + conc * conc, 0);
    
    return (1 - herfindahl) * 100; // Convert to 0-100 scale
  }

  private categorizeByPrice(price: number): string {
    if (price < 500000) return 'Small Commercial (<$500k)';
    if (price < 2000000) return 'Mid-Market ($500k-$2M)';
    if (price < 10000000) return 'Large Commercial ($2M-$10M)';
    return 'Institutional (>$10M)';
  }

  private isUndervalued(property: CommercialPropertyData): boolean {
    // Simple valuation check based on market averages
    const marketPricePerSqft = this.getMarketPricePerSqft(property.propertyType, property.location.state);
    return property.pricePerSqft < marketPricePerSqft * 0.9;
  }

  private hasStableIncome(property: CommercialPropertyData): boolean {
    if (!property.tenants || property.tenants.length === 0) return false;
    
    const averageLeaseLength = this.calculateAverageLeaseLength(property);
    const occupancyRate = this.calculateOccupancyRate(property);
    
    return averageLeaseLength > 3 && occupancyRate > 85;
  }

  private calculateLocationScore(property: CommercialPropertyData): number {
    // Scoring based on major markets (this could be enhanced with real market data)
    const majorMarkets = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
    const state = property.location.state.toUpperCase();
    
    if (majorMarkets.includes(state)) return 80;
    return 60;
  }

  private calculatePropertyConditionScore(property: CommercialPropertyData): number {
    if (!property.yearBuilt) return 60; // Unknown, assume average
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - property.yearBuilt;
    
    if (age < 10) return 90;
    if (age < 20) return 75;
    if (age < 30) return 60;
    return 40;
  }

  private calculateValueScore(property: CommercialPropertyData): number {
    const marketPrice = this.getMarketPricePerSqft(property.propertyType, property.location.state);
    const ratio = property.pricePerSqft / marketPrice;
    
    if (ratio < 0.8) return 90; // Great value
    if (ratio < 1.0) return 75; // Good value
    if (ratio < 1.2) return 60; // Fair value
    return 40; // Overpriced
  }

  private calculateIncomeScore(capRate: number, noi: number): number {
    let score = 0;
    
    // Cap rate component
    if (capRate >= this.config.scoring.capRateRanges.excellent.min) score += 50;
    else if (capRate >= this.config.scoring.capRateRanges.good.min) score += 35;
    else if (capRate >= this.config.scoring.capRateRanges.fair.min) score += 20;
    else score += 10;
    
    // NOI component
    if (noi > 200000) score += 40;
    else if (noi > 100000) score += 30;
    else if (noi > 50000) score += 20;
    else score += 10;
    
    return Math.min(score, 100);
  }

  private calculateStabilityScore(property: CommercialPropertyData): number {
    let score = 50; // Base score
    
    if (this.hasStableIncome(property)) score += 30;
    if (this.calculateOccupancyRate(property) > 90) score += 20;
    
    return Math.min(score, 100);
  }

  private calculateOverallScore(metrics: CommercialPropertyMetrics, property: CommercialPropertyData): number {
    const weights = this.config.scoring.weights;
    
    let totalScore = 0;
    totalScore += (metrics.incomeScore * weights.capRate) / 100;
    totalScore += (this.normalizeCashFlow(metrics.cashOnCashROI) * weights.cashFlow) / 100;
    totalScore += (metrics.locationScore * weights.location) / 100;
    totalScore += (metrics.stabilityScore * weights.tenantStability) / 100;
    totalScore += (metrics.propertyConditionScore * weights.propertyCondition) / 100;
    totalScore += (metrics.valueScore * weights.value) / 100;
    totalScore += (metrics.tenantDiversification * weights.diversification) / 100;
    
    return Math.min(Math.max(totalScore, 0), 100);
  }

  private normalizeCashFlow(cashOnCashROI: number): number {
    // Normalize cash-on-cash ROI to 0-100 scale
    const roiPercent = cashOnCashROI * 100;
    
    if (roiPercent >= 15) return 100;
    if (roiPercent >= 10) return 80;
    if (roiPercent >= 6) return 60;
    if (roiPercent >= 3) return 40;
    if (roiPercent >= 0) return 20;
    return 0;
  }

  private getMarketPricePerSqft(propertyType: string, state: string): number {
    // Market averages by property type and state (simplified)
    const baseRates: { [key: string]: number } = {
      'Office': 200,
      'Retail': 150,
      'Industrial': 80,
      'Warehouse': 60,
      'Mixed Use': 180,
      'Commercial': 150,
    };
    
    const stateMultipliers: { [key: string]: number } = {
      'CA': 1.8, 'NY': 1.7, 'MA': 1.5, 'WA': 1.4, 'FL': 1.2,
      'TX': 1.1, 'IL': 1.1, 'PA': 1.0, 'OH': 0.9, 'GA': 0.9,
    };
    
    const baseRate = baseRates[propertyType] || baseRates['Commercial'];
    const multiplier = stateMultipliers[state.toUpperCase()] || 1.0;
    
    return baseRate * multiplier;
  }
}

export const commercialPropertyScorer = new CommercialPropertyScorer();