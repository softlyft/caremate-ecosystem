export const PROFILE_PHI_FIELDS = [
  'date_of_birth',
  'national_id',
  'phone',
  'address_line',
  'city',
  'postal_code',
  'state',
  'gender',
  'marital_status',
] as const;

export type ProfilePhiField = (typeof PROFILE_PHI_FIELDS)[number];

export const EMERGENCY_PHI_FIELDS = [
  'blood_group',
  'genotype',
  'allergies',
  'current_medications',
  'chronic_conditions',
  'emergency_contacts',
  'preferred_hospital',
  'insurance_provider',
  'notes',
] as const;

export type EmergencyPhiField = (typeof EMERGENCY_PHI_FIELDS)[number];

/** Ciphertext envelope prefix used by the gateway field cipher. */
export const FIELD_CIPHER_PREFIX = 'v1:';
