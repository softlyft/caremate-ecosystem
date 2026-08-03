export {
  ARTICLE_THUMBNAILS,
  estimateReadingTime,
  getHealthCategory,
  getHealthCategoryName,
  getHealthCategoryShortLabel,
  HEALTH_CATEGORIES,
  healthCategoryIdsForQuery,
  isHealthCategoryId,
  LEGACY_HEALTH_CATEGORY_ID_MAP,
  normalizeHealthCategoryId,
  type HealthCategory,
  type HealthCategoryId,
} from '@/domains/articles/categories';

type GreetingLabels = {
  morning: string;
  afternoon: string;
  evening: string;
};

export function getGreeting(labels?: Partial<GreetingLabels>): string {
  const hour = new Date().getHours();
  if (hour < 12) return labels?.morning ?? 'Good Morning';
  if (hour < 17) return labels?.afternoon ?? 'Good Afternoon';
  return labels?.evening ?? 'Good Evening';
}

export const PROVIDER_TYPE_FILTERS = [
  { type: 'hospital' as const, color: '#DBEAFE' },
  { type: 'clinic' as const, color: '#FFEDD5' },
  { type: 'pharmacy' as const, color: '#CCFBF1' },
  { type: 'laboratory' as const, color: '#EDE9FE' },
  { type: 'imaging_centre' as const, color: '#FCE7F3' },
  { type: 'dentist' as const, color: '#CFFAFE' },
  { type: 'eye_care' as const, color: '#DBEAFE' },
  { type: 'insurance' as const, color: '#E0E7FF' },
];
