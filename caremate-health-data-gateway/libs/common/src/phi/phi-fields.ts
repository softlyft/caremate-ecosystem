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

/** Family member clinical / demographic PHI (names stay plaintext like profiles). */
export const FAMILY_MEMBER_PHI_FIELDS = [
  'date_of_birth',
  'gender',
  'notes',
] as const;

export type FamilyMemberPhiField = (typeof FAMILY_MEMBER_PHI_FIELDS)[number];

/** Message free-text PHI. */
export const MESSAGE_PHI_FIELDS = ['body', 'subject'] as const;

export type MessagePhiField = (typeof MESSAGE_PHI_FIELDS)[number];

/** Document metadata PHI (file bytes are a separate follow-up). */
export const DOCUMENT_PHI_FIELDS = ['title', 'file_name'] as const;

export type DocumentPhiField = (typeof DOCUMENT_PHI_FIELDS)[number];

/** Ciphertext envelope prefix used by the gateway field cipher. */
export const FIELD_CIPHER_PREFIX = 'v1:';
