export {
  ARTICLE_THUMBNAILS,
  estimateReadingTime,
  HEALTH_CATEGORIES,
} from '@/domains/articles/categories';

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export const PROVIDER_TYPE_FILTERS = [
  { label: 'Hospitals', type: 'hospital' as const, color: '#DBEAFE' },
  { label: 'Pharmacies', type: 'pharmacy' as const, color: '#DCFCE7' },
  { label: 'Labs', type: 'laboratory' as const, color: '#EDE9FE' },
  { label: 'Clinics', type: 'clinic' as const, color: '#FFEDD5' },
  { label: 'Telemedicine', type: 'telemedicine' as const, color: '#E0F2FE' },
  { label: 'Blood banks', type: 'blood_bank' as const, color: '#FEE2E2' },
  { label: 'Ambulance', type: 'ambulance' as const, color: '#FEF3C7' },
];
