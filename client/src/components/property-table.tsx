import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalculationBreakdown } from "@/components/calculation-breakdown";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Star,
  ExternalLink,
  GitCompare
} from "lucide-react";
import type { Property } from "@shared/schema";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PropertyImageFallback } from "./states";

function PropertyThumb({ src, alt }: { src: string | null; alt: string }) {
  const [error, setError] = useState(false);
  return (
    <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
      {src && !error ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setError(true)} />
      ) : (
        <PropertyImageFallback compact />
      )}
    </div>
  );
}

interface PropertyTableProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  originalProperties?: Property[];
  onCompareClick?: (original: Property, rescored: Property) => void;
  selectedPropertyIds?: Set<string>;
  onToggleSelection?: (zpid: string) => void;
  showCheckboxes?: boolean;
}

interface SortConfig {
  key: keyof Property | string;
  direction: 'asc' | 'desc';
}

// Numeric columns come back from the API as strings; coerce for sorting/math.
const NUMERIC_KEYS = new Set<string>([
  'investmentScorePercent',
  'price',
  'numBeds',
  'numBaths',
  'sizeSqFt',
  'capRatePercent',
  'cashOnCashRoi',
  'monthlyCashFlow',
  'rentEstimate',
]);

export function PropertyTable({
  properties,
  onPropertyClick,
  originalProperties,
  onCompareClick,
  selectedPropertyIds,
  onToggleSelection,
  showCheckboxes = false
}: PropertyTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'investmentScorePercent', direction: 'desc' });

  const handleSort = (key: keyof Property | string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedProperties = [...properties].sort((a, b) => {
    let aVal: any = a[sortConfig.key as keyof Property];
    let bVal: any = b[sortConfig.key as keyof Property];

    // Numeric columns arrive as strings; convert for numeric comparison.
    if (NUMERIC_KEYS.has(sortConfig.key as string)) {
      aVal = aVal === null || aVal === undefined || aVal === '' ? null : Number(aVal);
      bVal = bVal === null || bVal === undefined || bVal === '' ? null : Number(bVal);
    }

    if (aVal === null || aVal === undefined) aVal = sortConfig.direction === 'asc' ? Infinity : -Infinity;
    if (bVal === null || bVal === undefined) bVal = sortConfig.direction === 'asc' ? Infinity : -Infinity;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortConfig.direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const SortButton = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(column)}
      className="h-auto p-2 font-semibold text-left justify-start hover:bg-slate-100"
    >
      {children}
      {sortConfig.key === column && (
        sortConfig.direction === 'asc' ?
          <ChevronUp className="ml-1 h-3 w-3" /> :
          <ChevronDown className="ml-1 h-3 w-3" />
      )}
    </Button>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {showCheckboxes && (
                <th className="text-center p-2 w-[40px]">
                  <span className="text-xs text-gray-500">Select</span>
                </th>
              )}
              <th className="text-left p-2 min-w-[240px]">
                <SortButton column="address">Property</SortButton>
              </th>
              <th className="text-center p-2 min-w-[70px]">
                <SortButton column="investmentScorePercent">Score</SortButton>
              </th>
              <th className="text-right p-2 min-w-[110px]">
                <SortButton column="price">Price</SortButton>
              </th>
              <th className="text-center p-2 min-w-[100px]">
                <SortButton column="numBeds">Beds/Baths</SortButton>
              </th>
              <th className="text-right p-2 min-w-[100px]">
                <SortButton column="sizeSqFt">Sq Ft</SortButton>
              </th>
              <th className="text-right p-2 min-w-[120px]">
                <SortButton column="capRatePercent">Cap Rate</SortButton>
              </th>
              <th className="text-right p-2 min-w-[140px]">
                <SortButton column="cashOnCashRoi">Cash-on-Cash</SortButton>
              </th>
              <th className="text-right p-2 min-w-[140px]">
                <SortButton column="monthlyCashFlow">Monthly Cash Flow</SortButton>
              </th>
              <th className="text-right p-2 min-w-[120px]">
                <SortButton column="rentEstimate">Rent Estimate</SortButton>
              </th>
              <th className="text-center p-2 min-w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProperties.map((property) => {
              const cashFlow = property.monthlyCashFlow != null ? Number(property.monthlyCashFlow) : null;
              const sqft = property.sizeSqFt != null ? Number(property.sizeSqFt) : null;
              return (
              <tr
                key={property.zpid}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onPropertyClick?.(property)}
              >
                {showCheckboxes && (
                  <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPropertyIds?.has(property.zpid) || false}
                      onCheckedChange={() => onToggleSelection?.(property.zpid)}
                    />
                  </td>
                )}
                <td className="p-2">
                  <div className="flex items-start gap-2">
                    <PropertyThumb src={property.imgMain} alt={property.address ?? ''} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{property.address}</p>
                      <p className="text-sm text-slate-600 truncate">
                        {property.addressCity}, {property.addressState} {property.addressZip}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {property.homeType?.replace('-', ' ')}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-2 text-center">
                  <CalculationBreakdown property={property} />
                </td>
                <td className="p-2 text-right">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(property.price)}
                  </p>
                </td>
                <td className="p-2 text-center">
                  <p className="text-sm text-slate-900">
                    {property.numBeds}bd / {property.numBaths}ba
                  </p>
                </td>
                <td className="p-2 text-right">
                  <p className="text-sm text-slate-900">
                    {sqft != null ? sqft.toLocaleString() : '-'} sqft
                  </p>
                </td>
                <td className="p-2 text-right">
                  <p className="text-sm text-slate-900">
                    {property.capRatePercent ?
                      formatPercent(property.capRatePercent) : '-'}
                  </p>
                </td>
                <td className="p-2 text-right">
                  <p className="text-sm text-slate-900">
                    {property.cashOnCashRoi ?
                      formatPercent(property.cashOnCashRoi) : '-'}
                  </p>
                </td>
                <td className="p-2 text-right">
                  <p className={`text-sm font-medium ${
                    cashFlow != null && cashFlow > 0
                      ? 'text-green-600'
                      : cashFlow != null && cashFlow < 0
                      ? 'text-red-600'
                      : 'text-slate-900'
                  }`}>
                    {cashFlow != null ?
                      formatCurrency(cashFlow) : '-'}
                  </p>
                </td>
                <td className="p-2 text-right">
                  <p className="text-sm text-slate-900">
                    {property.rentEstimate ?
                      formatCurrency(property.rentEstimate) : '-'}
                  </p>
                </td>
                <td className="p-2">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPropertyClick?.(property);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    {originalProperties && onCompareClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const originalProperty = originalProperties.find(orig => orig.zpid === property.zpid);
                          if (originalProperty) {
                            onCompareClick(originalProperty, property);
                          }
                        }}
                        title="Compare Before/After"
                      >
                        <GitCompare className="h-4 w-4" />
                      </Button>
                    )}
                    {property.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(property.url!, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedProperties.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">No properties to display</p>
        </div>
      )}
    </div>
  );
}
