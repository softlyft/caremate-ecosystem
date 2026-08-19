import type { EmergencyProfile, Profile } from '@/types';

import { gatewayRequest, isHealthDataGatewayConfigured } from './client';

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

export type GatewayMiniAppSnapshotRow = {
  id: string;
  user_id: string;
  app_key: string;
  payload: Record<string, unknown>;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
  created_at?: string | null;
};

export function miniAppSnapshotToGatewayBody(snapshot: {
  id: string;
  userId: string;
  appKey: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}): Record<string, unknown> {
  return {
    id: snapshot.id,
    user_id: snapshot.userId,
    app_key: snapshot.appKey,
    payload: snapshot.payload,
    updated_at: snapshot.updatedAt,
  };
}

/** Upsert via gateway. Returns the saved row, or `null` when gateway URL is unset. */
export async function upsertMiniAppSnapshotViaGateway(snapshot: {
  id: string;
  userId: string;
  appKey: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}): Promise<GatewayMiniAppSnapshotRow | null> {
  return gatewayRequest<GatewayMiniAppSnapshotRow>(
    'PUT',
    '/v1/mini-app-snapshots',
    miniAppSnapshotToGatewayBody(snapshot),
  );
}

/** List decrypted snapshots. `null` when gateway URL is unset. */
export async function fetchMiniAppSnapshotsViaGateway(): Promise<
  GatewayMiniAppSnapshotRow[] | null
> {
  return gatewayRequest<GatewayMiniAppSnapshotRow[]>('GET', '/v1/mini-app-snapshots');
}

// ─── Family members ───────────────────────────────────────────────────────────

export type GatewayFamilyMemberRow = {
  id: string;
  household_id: string;
  kind: string;
  linked_user_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
};

export function familyMemberToGatewayBody(member: {
  id: string;
  householdId: string;
  kind: string;
  linkedUserId: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}): Record<string, unknown> {
  return {
    id: member.id,
    household_id: member.householdId,
    kind: member.kind,
    linked_user_id: member.linkedUserId,
    full_name: member.fullName,
    date_of_birth: member.dateOfBirth,
    gender: member.gender,
    notes: member.notes,
    created_at: member.createdAt,
    updated_at: member.updatedAt,
  };
}

export async function upsertFamilyMemberViaGateway(member: {
  id: string;
  householdId: string;
  kind: string;
  linkedUserId: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}): Promise<GatewayFamilyMemberRow | null> {
  return gatewayRequest<GatewayFamilyMemberRow>(
    'PUT',
    '/v1/family/members',
    familyMemberToGatewayBody(member),
  );
}

export async function fetchFamilyMembersViaGateway(): Promise<GatewayFamilyMemberRow[] | null> {
  return gatewayRequest<GatewayFamilyMemberRow[]>('GET', '/v1/family/members');
}

export async function deleteFamilyMemberViaGateway(memberId: string): Promise<boolean> {
  if (!isHealthDataGatewayConfigured()) {
    return false;
  }
  await gatewayRequest<unknown>('DELETE', `/v1/family/members/${memberId}`);
  return true;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export type GatewayMessageRow = {
  id: string;
  conversation_id: string;
  sender_party_type: 'user' | 'organization';
  sender_user_id: string | null;
  sender_organization_id: string | null;
  body: string;
  subject: string | null;
  created_at: string;
};

export type GatewayConversationRow = {
  id: string;
  kind: 'org_patient' | 'direct';
  organization_id: string | null;
  patient_user_id: string | null;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchConversationsViaGateway(): Promise<GatewayConversationRow[] | null> {
  return gatewayRequest<GatewayConversationRow[]>('GET', '/v1/messages/conversations');
}

export async function fetchMessagesViaGateway(
  conversationId: string,
): Promise<GatewayMessageRow[] | null> {
  return gatewayRequest<GatewayMessageRow[]>('GET', `/v1/messages/conversations/${conversationId}`);
}

export async function postMessageReplyViaGateway(
  conversationId: string,
  body: string,
  subject?: string | null,
): Promise<GatewayMessageRow | null> {
  return gatewayRequest<GatewayMessageRow>('POST', '/v1/messages/reply', {
    conversation_id: conversationId,
    body,
    subject: subject ?? null,
  });
}

export async function sealMessagesViaGateway(messageIds: string[]): Promise<boolean> {
  if (messageIds.length === 0) return true;
  const result = await gatewayRequest<{ sealed: number }>('POST', '/v1/messages/seal', {
    message_ids: messageIds,
  });
  return result != null;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export type GatewayDocumentRow = {
  id: string;
  organization_id: string | null;
  patient_id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  uploaded_by?: string | null;
  source: 'provider' | 'patient';
  created_at?: string | null;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
};

export async function fetchDocumentsViaGateway(): Promise<GatewayDocumentRow[] | null> {
  return gatewayRequest<GatewayDocumentRow[]>('GET', '/v1/documents');
}

export async function upsertDocumentViaGateway(doc: {
  id: string;
  organizationId: string | null;
  patientId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  uploadedBy: string | null;
  source: 'provider' | 'patient';
}): Promise<GatewayDocumentRow | null> {
  return gatewayRequest<GatewayDocumentRow>('PUT', '/v1/documents', {
    id: doc.id,
    organization_id: doc.organizationId,
    patient_id: doc.patientId,
    document_type: doc.documentType,
    title: doc.title,
    file_url: doc.fileUrl,
    file_name: doc.fileName,
    mime_type: doc.mimeType,
    uploaded_by: doc.uploadedBy,
    source: doc.source,
  });
}

// ─── Health timeline ──────────────────────────────────────────────────────────

export type GatewayHealthTimelineEventRow = {
  id: string;
  user_id: string;
  app_key: string;
  kind: string;
  occurred_on: string;
  occurred_at: string | null;
  title: string;
  summary: string;
  payload: Record<string, unknown> | unknown;
  created_at?: string | null;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
};

export function healthTimelineEventToGatewayBody(event: {
  id: string;
  userId: string;
  appKey: string;
  kind: string;
  occurredOn: string;
  occurredAt: string | null;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}): Record<string, unknown> {
  return {
    id: event.id,
    user_id: event.userId,
    app_key: event.appKey,
    kind: event.kind,
    occurred_on: event.occurredOn,
    occurred_at: event.occurredAt,
    title: event.title,
    summary: event.summary,
    payload: event.payload,
    updated_at: event.updatedAt,
  };
}

export async function upsertHealthTimelineEventViaGateway(event: {
  id: string;
  userId: string;
  appKey: string;
  kind: string;
  occurredOn: string;
  occurredAt: string | null;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}): Promise<GatewayHealthTimelineEventRow | null> {
  return gatewayRequest<GatewayHealthTimelineEventRow>(
    'PUT',
    '/v1/health-timeline',
    healthTimelineEventToGatewayBody(event),
  );
}

export async function fetchHealthTimelineEventsViaGateway(): Promise<
  GatewayHealthTimelineEventRow[] | null
> {
  return gatewayRequest<GatewayHealthTimelineEventRow[]>('GET', '/v1/health-timeline');
}

export async function deleteHealthTimelineEventViaGateway(eventId: string): Promise<boolean> {
  if (!isHealthDataGatewayConfigured()) {
    return false;
  }
  await gatewayRequest<unknown>('DELETE', `/v1/health-timeline/${encodeURIComponent(eventId)}`);
  return true;
}
