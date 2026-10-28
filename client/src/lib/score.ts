/**
 * Investment score tiers, shared by badges, cards, tables and map markers so the
 * colour scale means the same thing everywhere.
 */

export type ScoreTierKey = 'high' | 'mid' | 'low';

export interface ScoreTier {
  key: ScoreTierKey;
  label: string;
  /** Hex colour for non-Tailwind consumers (Mapbox paint expressions). */
  hex: string;
  /** Solid background + text classes for chips/badges. */
  badgeClass: string;
  /** Soft background + text classes for subtle chips. */
  softClass: string;
}

export const SCORE_THRESHOLDS = { high: 80, mid: 60 } as const;

export const SCORE_TIERS: Record<ScoreTierKey, ScoreTier> = {
  high: {
    key: 'high',
    label: 'Excellent',
    hex: '#10B981',
    badgeClass: 'bg-score-high hover:bg-score-high text-white',
    softClass: 'bg-score-high/10 text-emerald-700 ring-1 ring-inset ring-score-high/30',
  },
  mid: {
    key: 'mid',
    label: 'Good',
    hex: '#F59E0B',
    badgeClass: 'bg-score-mid hover:bg-score-mid text-white',
    softClass: 'bg-score-mid/10 text-amber-700 ring-1 ring-inset ring-score-mid/30',
  },
  low: {
    key: 'low',
    label: 'Fair',
    hex: '#EF4444',
    badgeClass: 'bg-score-low hover:bg-score-low text-white',
    softClass: 'bg-score-low/10 text-red-700 ring-1 ring-inset ring-score-low/30',
  },
};

/** Numeric columns come back as strings from the API; coerce safely. */
export function toScore(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function getScoreTier(value: number | string | null | undefined): ScoreTier {
  const score = toScore(value);
  if (score >= SCORE_THRESHOLDS.high) return SCORE_TIERS.high;
  if (score >= SCORE_THRESHOLDS.mid) return SCORE_TIERS.mid;
  return SCORE_TIERS.low;
}
