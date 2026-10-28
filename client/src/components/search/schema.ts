import { z } from 'zod';

export const searchFormSchema = z.object({
  platform: z.enum(['zillow', 'loopnet', 'redfin', 'crexi', 'multi']),
  location: z.string().min(1, 'Location is required'),
  propertyType: z.enum(['residential', 'commercial', 'mixed']).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  bedsMin: z.number().min(0).optional(),
  bedsMax: z.number().min(0).optional(),
  bathsMin: z.number().min(0).optional(),
  bathsMax: z.number().min(0).optional(),
  sqftMin: z.number().min(0).optional(),
  sqftMax: z.number().min(0).optional(),
  homeType: z.string().optional(),
  propertyTypes: z.array(z.string()).optional(),
  maxResults: z.number().min(1).max(100).default(20),
});

export type SearchFormData = z.infer<typeof searchFormSchema>;

export const SEARCH_DEFAULTS: SearchFormData = {
  platform: 'multi',
  location: '',
  propertyTypes: [],
  priceMin: undefined,
  priceMax: undefined,
  bedsMin: undefined,
  bedsMax: undefined,
  bathsMin: undefined,
  bathsMax: undefined,
  sqftMin: undefined,
  sqftMax: undefined,
  homeType: undefined,
  maxResults: 25,
};
