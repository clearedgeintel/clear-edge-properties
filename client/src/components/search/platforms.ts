import type { LucideIcon } from 'lucide-react';
import { Building2, Home, Layers } from 'lucide-react';

export type PlatformKey = 'multi' | 'zillow' | 'redfin' | 'loopnet' | 'crexi';

export interface PlatformInfo {
  name: string;
  shortName: string;
  icon: LucideIcon;
  description: string;
  /** Chip on result photos. */
  badgeClass: string;
  propertyTypes: string[];
  commercial: boolean;
}

// Multi-platform first: it's the default and the most common choice.
export const PLATFORMS: Record<PlatformKey, PlatformInfo> = {
  multi: {
    name: 'All platforms',
    shortName: 'All',
    icon: Layers,
    description: 'Search every platform at once',
    badgeClass: 'bg-brand-navy text-white',
    propertyTypes: [],
    commercial: false,
  },
  zillow: {
    name: 'Zillow',
    shortName: 'Zillow',
    icon: Home,
    description: 'Residential properties, condos, and land',
    badgeClass: 'bg-[#006AFF] text-white',
    propertyTypes: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'Land'],
    commercial: false,
  },
  redfin: {
    name: 'Redfin',
    shortName: 'Redfin',
    icon: Home,
    description: 'Residential properties (limited coverage)',
    badgeClass: 'bg-[#C82021] text-white',
    propertyTypes: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family'],
    commercial: false,
  },
  loopnet: {
    name: 'LoopNet',
    shortName: 'LoopNet',
    icon: Building2,
    description: 'Commercial properties with coordinates',
    badgeClass: 'bg-[#1F3A5F] text-white',
    propertyTypes: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use', 'Hotel', 'Land'],
    commercial: true,
  },
  crexi: {
    name: 'Crexi',
    shortName: 'Crexi',
    icon: Building2,
    description: 'Commercial listings (office, retail, industrial, land)',
    badgeClass: 'bg-[#F26B21] text-white',
    propertyTypes: ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Hospitality', 'Mixed Use'],
    commercial: true,
  },
};

export const PLATFORM_ORDER: PlatformKey[] = ['multi', 'zillow', 'redfin', 'loopnet', 'crexi'];

export function platformInfo(key: string): PlatformInfo {
  return PLATFORMS[key as PlatformKey] ?? { ...PLATFORMS.multi, name: key, shortName: key };
}

export const isCommercialPlatform = (key: string) => platformInfo(key).commercial;
