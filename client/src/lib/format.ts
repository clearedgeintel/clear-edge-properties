/**
 * Shared formatting utilities for currency, percentages, and numbers.
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | string | null | undefined, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return fallback;
  return currencyFormatter.format(num);
}

export function formatPrice(price: number | string): string {
  return formatCurrency(price, '$0');
}

export function formatCompactPrice(price: number): string {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`;
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}k`;
  return `$${price.toLocaleString()}`;
}

export function formatPercent(value: number | string | null | undefined, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return fallback;
  return `${num.toFixed(2)}%`;
}

export function formatROI(roi?: string | null): string | null {
  if (!roi) return null;
  return `Est. ROI: ${parseFloat(roi).toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
