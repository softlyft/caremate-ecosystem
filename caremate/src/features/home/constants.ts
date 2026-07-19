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
  { type: 'clinic' as const, color: '#FFEDD5' },
  { type: 'pharmacy' as const, color: '#CCFBF1' },
  { type: 'laboratory' as const, color: '#EDE9FE' },
  { type: 'imaging_centre' as const, color: '#FCE7F3' },
  { type: 'blood_bank' as const, color: '#FEE2E2' },
  { type: 'ambulance' as const, color: '#FEF3C7' },
  { type: 'telemedicine' as const, color: '#E0F2FE' },
  { type: 'insurance' as const, color: '#E0E7FF' },
  { type: 'mental_health' as const, color: '#F3E8FF' },
  { type: 'dentist' as const, color: '#CFFAFE' },
  { type: 'eye_care' as const, color: '#DBEAFE' },
  { type: 'home_care' as const, color: '#DCFCE7' },
  { type: 'medical_equipment' as const, color: '#FFEDD5' },
  { type: 'government_health' as const, color: '#E2E8F0' },
  { type: 'ngo' as const, color: '#FEF3C7' },
];
