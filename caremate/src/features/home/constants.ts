export {
  ARTICLE_THUMBNAILS,
  estimateReadingTime,
  HEALTH_CATEGORIES,
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
  { type: 'pharmacy' as const, color: '#CCFBF1' },
  { type: 'laboratory' as const, color: '#EDE9FE' },
  { type: 'clinic' as const, color: '#FFEDD5' },
  { type: 'telemedicine' as const, color: '#E0F2FE' },
  { type: 'blood_bank' as const, color: '#FEE2E2' },
  { type: 'ambulance' as const, color: '#FEF3C7' },
];
