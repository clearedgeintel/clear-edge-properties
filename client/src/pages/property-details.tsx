import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Download, 
  Search, 
  Filter, 
  Calculator, 
  TrendingUp, 
  DollarSign,
  Home,
  ArrowUpDown,
  Eye,
  Building,
  ExternalLink,
  Columns,
  Check
} from 'lucide-react';
import { Property } from '@shared/schema';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format';
import { PropertyDrawer } from '@/components/property-drawer';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PropertyFinancials {
  zpid: string;
  address: string;
  city: string;
  state: string;
  price: number;
  score: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  estimatedRoi: number;

  // Database metrics
  zestimate: number;
  taxAssessed: number;
  daysOnZillow: number;
  yearBuilt: number | null;
  
  // Calculated financial metrics
  downPayment: number;
  closingCosts: number;
  totalCashNeeded: number;
  loanAmount: number;
  monthlyMortgage: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyExpenses: number;
  estimatedRent: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCashROI: number;
  dscr: number;
  pricePerSqft: number;
  rentToPrice: number;
  
  // Market metrics
  marketValue: number;
  appreciationRate: number;
  fiveYearValue: number;
  equityAtPurchase: number;
  
  // Risk indicators
  vacancyRate: number;
  marketRisk: string;
  liquidityScore: number;
}

interface FinancialConfig {
  downPaymentPercent: number;
  closingCostPercent: number;
  loanInterestRate: number;
  loanTermYears: number;
  propertyTaxRate: number;
  monthlyInsuranceEstimate: number;
  vacancyRatePercent: number;
  annualAppreciationRate: number;
}

const defaultConfig: FinancialConfig = {
  downPaymentPercent: 20,
  closingCostPercent: 3,
  loanInterestRate: 7,
  loanTermYears: 30,
  propertyTaxRate: 1.25,
  monthlyInsuranceEstimate: 100,
  vacancyRatePercent: 5,
  annualAppreciationRate: 3,
};

// Define column configuration type
interface ColumnConfig {
  key: string;
  label: string;
  category: string;
  defaultVisible: boolean;
}

// Define all available columns with their metadata
const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'address', label: 'Property', category: 'Basic', defaultVisible: true },
  { key: 'price', label: 'Price', category: 'Basic', defaultVisible: true },
  { key: 'marketValue', label: 'Zestimate', category: 'Basic', defaultVisible: true },
  { key: 'score', label: 'Score', category: 'Basic', defaultVisible: true },
  { key: 'totalCashNeeded', label: 'Cash Needed', category: 'Investment', defaultVisible: true },
  { key: 'estimatedRent', label: 'Rent Est.', category: 'Income', defaultVisible: true },
  { key: 'monthlyCashFlow', label: 'Cash Flow', category: 'Income', defaultVisible: true },
  { key: 'capRate', label: 'Cap Rate', category: 'Returns', defaultVisible: true },
  { key: 'cashOnCashROI', label: 'COC ROI', category: 'Returns', defaultVisible: true },
  { key: 'dscr', label: 'DSCR', category: 'Risk', defaultVisible: true },
  { key: 'pricePerSqft', label: '$/Sqft', category: 'Basic', defaultVisible: true },
  { key: 'rentToPrice', label: 'Rent/Price', category: 'Returns', defaultVisible: true },
  { key: 'daysOnZillow', label: 'Days Listed', category: 'Basic', defaultVisible: true },
  { key: 'yearBuilt', label: 'Year Built', category: 'Basic', defaultVisible: true },
  { key: 'marketRisk', label: 'Risk', category: 'Risk', defaultVisible: true },
  
  // Additional columns (hidden by default)
  { key: 'bedrooms', label: 'Bedrooms', category: 'Property Details', defaultVisible: false },
  { key: 'bathrooms', label: 'Bathrooms', category: 'Property Details', defaultVisible: false },
  { key: 'sqft', label: 'Square Feet', category: 'Property Details', defaultVisible: false },
  { key: 'propertyType', label: 'Property Type', category: 'Property Details', defaultVisible: false },
  { key: 'city', label: 'City', category: 'Location', defaultVisible: false },
  { key: 'state', label: 'State', category: 'Location', defaultVisible: false },
  { key: 'zestimate', label: 'Zestimate', category: 'Valuation', defaultVisible: false },
  { key: 'taxAssessed', label: 'Tax Assessed', category: 'Valuation', defaultVisible: false },
  { key: 'downPayment', label: 'Down Payment', category: 'Investment', defaultVisible: false },
  { key: 'closingCosts', label: 'Closing Costs', category: 'Investment', defaultVisible: false },
  { key: 'loanAmount', label: 'Loan Amount', category: 'Financing', defaultVisible: false },
  { key: 'monthlyMortgage', label: 'Monthly Mortgage', category: 'Financing', defaultVisible: false },
  { key: 'monthlyTaxes', label: 'Monthly Taxes', category: 'Expenses', defaultVisible: false },
  { key: 'monthlyInsurance', label: 'Monthly Insurance', category: 'Expenses', defaultVisible: false },
  { key: 'monthlyExpenses', label: 'Monthly Expenses', category: 'Expenses', defaultVisible: false },
  { key: 'annualCashFlow', label: 'Annual Cash Flow', category: 'Income', defaultVisible: false },
  { key: 'fiveYearValue', label: '5-Year Value', category: 'Appreciation', defaultVisible: false },
  { key: 'equityAtPurchase', label: 'Equity at Purchase', category: 'Equity', defaultVisible: false },
  { key: 'appreciationRate', label: 'Appreciation Rate', category: 'Appreciation', defaultVisible: false },
  { key: 'vacancyRate', label: 'Vacancy Rate', category: 'Risk', defaultVisible: false },
  { key: 'liquidityScore', label: 'Liquidity Score', category: 'Risk', defaultVisible: false },
];

// Get default visible columns
const getDefaultVisibleColumns = () => 
  AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key);

export default function PropertyDetailsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof PropertyFinancials>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [config, setConfig] = useState<FinancialConfig>(defaultConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getDefaultVisibleColumns());

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const calculateFinancials = (property: Property): PropertyFinancials => {
    const price = Number(property.price) || 0;
    const sqft = Number(property.sizeSqFt ?? property.livingAreaSqFt) || 0;
    const propScore = Number(property.investmentScorePercent) || 0;

    // Pull metric columns directly from the property (numeric columns come back as strings)
    const zestimate = Number(property.zestimate) || price;
    const rentEstimate = Number(property.rentEstimate ?? property.rentZestimate) || (price * 0.01);
    const taxAssessed = Number(property.taxAssessed ?? property.taxAssessedValue) || (price * 0.85);
    const daysOnZillow = Number(property.daysOnZillow) || 0;
    const yearBuilt = property.yearBuilt ?? null;
    
    // Basic calculations
    const downPayment = price * (config.downPaymentPercent / 100);
    const closingCosts = price * (config.closingCostPercent / 100);
    const totalCashNeeded = downPayment + closingCosts;
    const loanAmount = price - downPayment;
    
    // Monthly mortgage calculation
    const monthlyRate = config.loanInterestRate / 100 / 12;
    const numPayments = config.loanTermYears * 12;
    const monthlyMortgage = loanAmount > 0 
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) 
        / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;
    
    // Monthly expenses
    const monthlyTaxes = (price * config.propertyTaxRate / 100) / 12;
    const monthlyInsurance = config.monthlyInsuranceEstimate;
    const monthlyExpenses = monthlyMortgage + monthlyTaxes + monthlyInsurance;
    
    // Revenue calculations using actual rent estimate if available
    const estimatedRent = rentEstimate;
    const adjustedRent = estimatedRent * (1 - config.vacancyRatePercent / 100);
    const monthlyCashFlow = adjustedRent - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    
    // Key ratios
    const capRate = price > 0 ? ((estimatedRent * 12 - monthlyTaxes * 12 - monthlyInsurance * 12) / price) * 100 : 0;
    const cashOnCashROI = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0;
    const dscr = monthlyMortgage > 0 ? adjustedRent / monthlyMortgage : 0;
    const pricePerSqft = sqft > 0 ? price / sqft : 0;
    const rentToPrice = price > 0 ? (estimatedRent * 12 / price) * 100 : 0;
    
    // Market calculations using Zestimate if available
    const marketValue = zestimate;
    const fiveYearValue = price * Math.pow(1 + config.annualAppreciationRate / 100, 5);
    const equityAtPurchase = Math.max(0, marketValue - price);
    
    // Risk assessment
    const getMarketRisk = (score: number) => {
      if (score >= 75) return 'Low';
      if (score >= 50) return 'Medium';
      return 'High';
    };
    
    const liquidityScore = Math.min(100, Math.max(0,
      (price < 500000 ? 80 : 60) +
      (property.homeType === 'Single Family' ? 20 : 0) +
      (propScore - 50)
    ));

    return {
      zpid: property.zpid,
      address: property.address ?? '',
      city: property.addressCity ?? '',
      state: property.addressState ?? '',
      price,
      score: propScore,
      bedrooms: Number(property.numBeds) || 0,
      bathrooms: Number(property.numBaths) || 0,
      sqft,
      propertyType: property.homeType ?? '',
      estimatedRoi: Number(property.cashOnCashRoi) || cashOnCashROI,

      // Database metrics
      zestimate,
      taxAssessed,
      daysOnZillow,
      yearBuilt,
      
      downPayment,
      closingCosts,
      totalCashNeeded,
      loanAmount,
      monthlyMortgage,
      monthlyTaxes,
      monthlyInsurance,
      monthlyExpenses,
      estimatedRent,
      monthlyCashFlow,
      annualCashFlow,
      capRate,
      cashOnCashROI,
      dscr,
      pricePerSqft,
      rentToPrice,
      
      marketValue,
      appreciationRate: config.annualAppreciationRate,
      fiveYearValue,
      equityAtPurchase,
      
      vacancyRate: config.vacancyRatePercent,
      marketRisk: getMarketRisk(propScore),
      liquidityScore,
    };
  };

  const financialData = useMemo(() => {
    return properties.map(calculateFinancials);
  }, [properties, config]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = financialData;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.state.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.propertyType === filterType);
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [financialData, searchTerm, filterType, sortColumn, sortDirection]);

  const handleSort = (column: keyof PropertyFinancials) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };


  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  const toggleAllColumns = (show: boolean) => {
    setVisibleColumns(show ? AVAILABLE_COLUMNS.map(col => col.key) : []);
  };

  const resetToDefault = () => {
    setVisibleColumns(getDefaultVisibleColumns());
  };

  // Get visible column definitions
  const visibleColumnDefs = AVAILABLE_COLUMNS.filter(col => visibleColumns.includes(col.key));

  // Function to render cell content based on column type
  const renderCellContent = (property: PropertyFinancials, column: ColumnConfig) => {
    const value = property[column.key as keyof PropertyFinancials];
    const columnKey = column.key;
    
    switch (columnKey) {
      case 'address':
        return (
          <div className="flex items-center gap-2">
            <div>
              <div className="font-semibold text-xs leading-tight">{property.address}</div>
              <div className="text-[11px] text-slate-600 leading-tight">
                {property.city}, {property.state}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                {property.bedrooms}bd • {property.bathrooms}ba • {formatNumber(property.sqft)}sf
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      
      case 'price':
      case 'marketValue':
      case 'zestimate':
      case 'taxAssessed':
      case 'downPayment':
      case 'closingCosts':
      case 'totalCashNeeded':
      case 'loanAmount':
      case 'monthlyMortgage':
      case 'monthlyTaxes':
      case 'monthlyInsurance':
      case 'monthlyExpenses':
      case 'estimatedRent':
      case 'fiveYearValue':
      case 'equityAtPurchase':
      case 'pricePerSqft':
        return (
          <div className="text-xs font-semibold text-right">
            {formatCurrency(value as number)}
          </div>
        );
      
      case 'monthlyCashFlow':
        return (
          <div className="text-right">
            <div className={`text-xs ${(value as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(value as number)}
            </div>
            <div className="text-[10px] text-slate-500">{formatCurrency(property.annualCashFlow)}/yr</div>
          </div>
        );
      
      case 'annualCashFlow':
        return (
          <div className={`text-xs text-right ${(value as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(value as number)}
          </div>
        );
      
      case 'capRate':
      case 'cashOnCashROI':
      case 'rentToPrice':
      case 'appreciationRate':
      case 'vacancyRate':
        return (
          <div className={`text-xs text-right ${
            columnKey === 'cashOnCashROI' && (value as number) >= 0 ? 'text-green-600' : 
            columnKey === 'cashOnCashROI' && (value as number) < 0 ? 'text-red-600' : ''
          }`}>
            {formatPercent(value as number)}
          </div>
        );
      
      case 'dscr':
        return (
          <div className={`text-xs text-right ${
            (value as number) >= 1.2 ? 'text-green-600' : 
            (value as number) >= 1.0 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {(value as number).toFixed(2)}
          </div>
        );
      
      case 'score':
        return (
          <div className="text-center">
            <Badge className={`${getScoreColor(value as number)} text-xs px-1 py-0`}>
              {value}
            </Badge>
          </div>
        );
      
      case 'marketRisk':
        return (
          <div className="text-center">
            <Badge className={`${getRiskColor(value as string)} text-xs px-1 py-0`}>
              {value}
            </Badge>
          </div>
        );
      
      case 'bedrooms':
      case 'bathrooms':
      case 'sqft':
      case 'daysOnZillow':
      case 'yearBuilt':
      case 'liquidityScore':
        return (
          <div className="text-xs text-center">
            {value ? formatNumber(value as number) : '-'}
          </div>
        );
      
      case 'propertyType':
      case 'city':
      case 'state':
        return (
          <div className="text-xs text-center">
            {value || '-'}
          </div>
        );
      
      default:
        return (
          <div className="text-xs">
            {typeof value === 'number' ? formatNumber(value) : value || '-'}
          </div>
        );
    }
  };

  const exportToCSV = () => {
    const headers = visibleColumnDefs.map(col => col.label);
    
    const csvData = [
      headers.join(','),
      ...filteredAndSortedData.map(item => 
        visibleColumnDefs.map(col => {
          const value = (item as any)[col.key];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value || '';
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-financial-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const propertyTypes = Array.from(new Set(properties.map(p => p.homeType).filter((t): t is string => Boolean(t))));

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
            <div className="h-32 bg-slate-200 rounded mb-6"></div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Property Financial Analysis</h1>
          <p className="text-slate-600">Comprehensive Excel-style financial breakdown for all properties</p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Analysis Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => setShowConfig(!showConfig)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Configure
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Columns className="w-4 h-4" />
                    Select Columns ({visibleColumns.length}/{AVAILABLE_COLUMNS.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Select Columns</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetToDefault}
                          className="text-xs h-7"
                        >
                          Reset
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAllColumns(true)}
                          className="text-xs h-7"
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAllColumns(false)}
                          className="text-xs h-7"
                        >
                          None
                        </Button>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {['Basic', 'Investment', 'Income', 'Returns', 'Risk', 'Property Details', 'Location', 'Valuation', 'Financing', 'Expenses', 'Appreciation', 'Equity'].map(category => {
                        const categoryColumns = AVAILABLE_COLUMNS.filter(col => col.category === category);
                        if (categoryColumns.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <h5 className="text-xs font-medium text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-1">
                              {category}
                            </h5>
                            <div className="space-y-2">
                              {categoryColumns.map(column => (
                                <div key={column.key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={column.key}
                                    checked={visibleColumns.includes(column.key)}
                                    onCheckedChange={() => toggleColumn(column.key)}
                                  />
                                  <label
                                    htmlFor={column.key}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {column.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="border-t pt-3">
                      <p className="text-xs text-slate-600">
                        {visibleColumns.length} of {AVAILABLE_COLUMNS.length} columns selected
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                onClick={exportToCSV}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {/* Configuration Panel */}
            {showConfig && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Financial Configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Down Payment (%)</label>
                    <Input
                      type="number"
                      value={config.downPaymentPercent}
                      onChange={(e) => setConfig({...config, downPaymentPercent: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Interest Rate (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.loanInterestRate}
                      onChange={(e) => setConfig({...config, loanInterestRate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Property Tax (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.propertyTaxRate}
                      onChange={(e) => setConfig({...config, propertyTaxRate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Vacancy Rate (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.vacancyRatePercent}
                      onChange={(e) => setConfig({...config, vacancyRatePercent: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Properties</p>
                  <p className="text-2xl font-bold">{filteredAndSortedData.length}</p>
                </div>
                <Building className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg. Cash Flow</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(filteredAndSortedData.reduce((sum, item) => sum + item.monthlyCashFlow, 0) / filteredAndSortedData.length || 0)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg. Cap Rate</p>
                  <p className="text-2xl font-bold">
                    {formatPercent(filteredAndSortedData.reduce((sum, item) => sum + item.capRate, 0) / filteredAndSortedData.length || 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg. Score</p>
                  <p className="text-2xl font-bold">
                    {Math.round(filteredAndSortedData.reduce((sum, item) => sum + item.score, 0) / filteredAndSortedData.length || 0)}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Analysis Grid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    {visibleColumnDefs.map(column => (
                      <TableHead key={column.key} className={`p-2 ${column.key === 'address' ? 'w-[180px]' : 'w-[80px]'}`}>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort(column.key as keyof PropertyFinancials)} 
                          className="h-auto p-0 font-semibold text-xs"
                        >
                          {column.label} <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((property) => {
                    const originalProperty = properties.find(p => p.zpid === property.zpid);
                    return (
                      <TableRow
                        key={property.zpid}
                        className="hover:bg-slate-50 text-xs cursor-pointer transition-colors group" 
                        onClick={() => originalProperty && handlePropertyClick(originalProperty)}
                      >
                        {visibleColumnDefs.map(column => (
                          <TableCell key={column.key} className="p-2">
                            {renderCellContent(property, column)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Drawer */}
      <PropertyDrawer
        property={selectedProperty}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}