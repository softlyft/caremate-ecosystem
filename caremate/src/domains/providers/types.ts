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
  'telemedicine',
  'blood_bank',
  'ambulance',
  // Secondary / specialty labels (kept for seeds & future filters)
  'dentist',
  'mental_health',
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

/** Primary catalog filters shown in Nearby (order = UI). */
export const PRIMARY_PROVIDER_TYPES = [
  'hospital',
  'clinic',
  'pharmacy',
  'laboratory',
  'telemedicine',
  'blood_bank',
  'ambulance',
] as const satisfies readonly ProviderType[];

export type PrimaryProviderType = (typeof PRIMARY_PROVIDER_TYPES)[number];

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
 */
export type ProviderAttributes = Record<string, unknown>;
