import type { EmergencyProfile, Profile } from '@/types';

import { gatewayRequest } from './client';

/** Snake_case row shape returned by gateway GET/PUT (matches Supabase columns). */
export type GatewayProfileRow = {
  id: string;
  user_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  country_code?: string | null;
  language_code?: string | null;
  state?: string | null;
  gender?: string | null;
  address_line?: string | null;
  city?: string | null;
  postal_code?: string | null;
  national_id?: string | null;
  marital_status?: string | null;
  is_health_practitioner?: boolean | null;
  patient_id?: string | null;
  emergency_share_token?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GatewayEmergencyRow = {
  id: string;
  user_id: string;
  full_name: string;
  photo_url?: string | null;
  blood_group?: string | null;
  genotype?: string | null;
  allergies?: unknown;
  current_medications?: unknown;
  chronic_conditions?: unknown;
  emergency_contacts?: unknown;
  preferred_hospital?: string | null;
  insurance_provider?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function profileToGatewayBody(profile: Profile): Record<string, unknown> {
  return {
    id: profile.id,
    user_id: profile.userId,
    full_name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    date_of_birth: profile.dateOfBirth,
    avatar_url: profile.avatarUrl,
    country_code: profile.countryCode,
    language_code: profile.languageCode,
    state: profile.state,
    gender: profile.gender,
    address_line: profile.addressLine,
    city: profile.city,
    postal_code: profile.postalCode,
    national_id: profile.nationalId,
    marital_status: profile.maritalStatus,
    is_health_practitioner: profile.isHealthPractitioner,
    patient_id: profile.patientId,
    emergency_share_token: profile.emergencyShareToken,
    updated_at: profile.updatedAt,
  };
}

export function emergencyToGatewayBody(profile: EmergencyProfile): Record<string, unknown> {
  return {
    id: profile.id,
    user_id: profile.userId,
    full_name: profile.fullName,
    photo_url: profile.photoUrl,
    blood_group: profile.bloodGroup,
    genotype: profile.genotype,
    allergies: profile.allergies,
    current_medications: profile.currentMedications,
    chronic_conditions: profile.chronicConditions,
    emergency_contacts: profile.emergencyContacts,
    preferred_hospital: profile.preferredHospital,
    insurance_provider: profile.insuranceProvider,
    notes: profile.notes,
    updated_at: profile.updatedAt,
  };
}

/** Upsert via gateway. `true` = succeeded; `false` = fall back to plaintext Supabase. */
export async function upsertProfileViaGateway(profile: Profile): Promise<boolean> {
  const result = await gatewayRequest<GatewayProfileRow>(
    'PUT',
    '/v1/profile',
    profileToGatewayBody(profile),
  );
  return result != null;
}

export async function fetchProfileViaGateway(): Promise<GatewayProfileRow | null> {
  return gatewayRequest<GatewayProfileRow>('GET', '/v1/profile');
}

/** Upsert via gateway. Returns the saved row, or `null` to fall back to plaintext Supabase. */
export async function upsertEmergencyViaGateway(
  profile: EmergencyProfile,
): Promise<GatewayEmergencyRow | null> {
  return gatewayRequest<GatewayEmergencyRow>(
    'PUT',
    '/v1/emergency',
    emergencyToGatewayBody(profile),
  );
}

export async function fetchEmergencyViaGateway(): Promise<GatewayEmergencyRow | null> {
  return gatewayRequest<GatewayEmergencyRow>('GET', '/v1/emergency');
}
