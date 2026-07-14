export const LEARN_CONTENT_TYPES = [
  'article',
  'video',
  'podcast',
  'campaign',
  'health_alert',
  'faq',
  'guide',
] as const;

export type LearnContentType = (typeof LEARN_CONTENT_TYPES)[number];

export const LEARN_CONTENT_TYPE_LABELS: Record<LearnContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  campaign: 'Campaign',
  health_alert: 'Health Alert',
  faq: 'FAQ',
  guide: 'Guide',
};

export const PROVIDER_TYPES = [
  'hospital',
  'clinic',
  'pharmacy',
  'laboratory',
  'telemedicine',
  'blood_bank',
  'ambulance',
  'dentist',
  'mental_health',
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  telemedicine: 'Telemedicine',
  blood_bank: 'Blood Bank',
  ambulance: 'Ambulance',
  dentist: 'Dentist',
  mental_health: 'Mental Health',
};
