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
  'imaging_centre',
  'blood_bank',
  'ambulance',
  'telemedicine',
  'insurance',
  'mental_health',
  'dentist',
  'eye_care',
  'home_care',
  'medical_equipment',
  'government_health',
  'ngo',
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  imaging_centre: 'Imaging Centre',
  blood_bank: 'Blood Bank',
  ambulance: 'Ambulance Service',
  telemedicine: 'Telemedicine',
  insurance: 'Insurance / HMO',
  mental_health: 'Mental Health',
  dentist: 'Dental Clinic',
  eye_care: 'Eye Care',
  home_care: 'Home Care',
  medical_equipment: 'Medical Equipment & Supplies',
  government_health: 'Government Health Services',
  ngo: 'NGO',
};

/** Nearby chip types — optional on provider_organizations and admin org form. */
export const ORGANIZATION_CATALOG_TYPES = [
  'hospital',
  'clinic',
  'pharmacy',
  'laboratory',
  'imaging_centre',
  'dentist',
  'eye_care',
] as const;

export type OrganizationCatalogType = (typeof ORGANIZATION_CATALOG_TYPES)[number];

export const ORGANIZATION_CATALOG_TYPE_LABELS: Record<OrganizationCatalogType, string> = {
  hospital: PROVIDER_TYPE_LABELS.hospital,
  clinic: PROVIDER_TYPE_LABELS.clinic,
  pharmacy: PROVIDER_TYPE_LABELS.pharmacy,
  laboratory: PROVIDER_TYPE_LABELS.laboratory,
  imaging_centre: PROVIDER_TYPE_LABELS.imaging_centre,
  dentist: PROVIDER_TYPE_LABELS.dentist,
  eye_care: PROVIDER_TYPE_LABELS.eye_care,
};
