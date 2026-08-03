/**
 * Provider model: one core `Provider` row + `type` discriminant.
 * Type-specific fields go in `attributes` (JSON) so we can evolve Hospital vs Pharmacy
 * without new tables or a schema redesign.
 */

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

/** Nearby filter chips (order = product category list). */
export const PRIMARY_PROVIDER_TYPES = [
  'hospital',
  'clinic',
  'pharmacy',
  'laboratory',
  'imaging_centre',
  'dentist',
  'eye_care',
  'insurance',
] as const satisfies readonly ProviderType[];

export type PrimaryProviderType = (typeof PRIMARY_PROVIDER_TYPES)[number];

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  imaging_centre: 'Imaging Centre',
  blood_bank: 'Blood Bank',
  ambulance: 'Ambulance Service',
  telemedicine: 'Telemedicine',
  insurance: 'Insurance',
  mental_health: 'Mental Health',
  dentist: 'Dental Clinic',
  eye_care: 'Eye Clinic',
  home_care: 'Home Care',
  medical_equipment: 'Medical Equipment & Supplies',
  government_health: 'Government Health Services',
  ngo: 'NGO',
};

export function isProviderType(value: string): value is ProviderType {
  return (PROVIDER_TYPES as readonly string[]).includes(value);
}

export function formatProviderType(type: string): string {
  if (isProviderType(type)) {
    return PROVIDER_TYPE_LABELS[type];
  }
  return type.replace(/_/g, ' ');
}

/**
 * Open bag for specialized attributes by type.
 * Examples (not enforced yet — evolve carefully):
 * - hospital: { emergencyDept?: boolean; beds?: number; traumaLevel?: string }
 * - pharmacy: { open24h?: boolean; delivery?: boolean }
 * - laboratory: { homeCollection?: boolean; tests?: string[] }
 * - telemedicine: { platforms?: string[]; languages?: string[] }
 * - ambulance: { coverageArea?: string; advancedLifeSupport?: boolean }
 * - blood_bank: { components?: string[]; appointmentRequired?: boolean }
 * - insurance: { plans?: string[]; networks?: string[] }
 * - imaging_centre: { modalities?: string[] }
 */
export type ProviderAttributes = Record<string, unknown>;
