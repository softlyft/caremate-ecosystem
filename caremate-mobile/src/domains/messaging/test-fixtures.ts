import type { MessageConversation, MessageMessage } from '@/domains/messaging/repository';

export const headerLabels = {
  directFallback: 'Direct',
  coordinationFallback: 'Care team',
  providerFallback: 'Provider',
  insurerFallback: 'Insurer',
  threadFallback: 'Conversation',
} as const;

export const senderLabels = {
  insurer: 'insurer',
  provider: 'provider',
  participant: 'participant',
  careTeam: 'care team',
  you: 'You',
  unknownUser: 'CareMate member',
  insurerFallback: 'Insurer',
  providerFallback: 'Provider',
} as const;

export const coordinationConversation: MessageConversation = {
  id: 'conv-coord',
  kind: 'care_coordination',
  organization_id: 'prov-1',
  payer_organization_id: 'pay-1',
  patient_user_id: 'patient-1',
  subject: null,
  last_message_at: null,
  last_message_preview: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  coordination_provider_name: 'City Clinic',
  coordination_payer_name: 'Leadway Insurance',
  title: 'City Clinic + Leadway Insurance',
};

export const orgPatientConversation: MessageConversation = {
  id: 'conv-org',
  kind: 'org_patient',
  organization_id: 'prov-1',
  payer_organization_id: null,
  org_side: 'provider',
  patient_user_id: 'patient-1',
  subject: null,
  last_message_at: null,
  last_message_preview: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  organization_name: 'City Clinic',
};

export const directConversation: MessageConversation = {
  id: 'conv-direct',
  kind: 'direct',
  organization_id: 'prov-1',
  payer_organization_id: null,
  patient_user_id: null,
  subject: null,
  last_message_at: null,
  last_message_preview: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  peer_name: 'Dr. Ada',
};

export function orgMessage(overrides: Partial<MessageMessage> = {}): MessageMessage {
  return {
    id: 'msg-1',
    conversation_id: 'conv-coord',
    sender_party_type: 'organization',
    sender_user_id: null,
    sender_organization_id: 'prov-1',
    sender_payer_organization_id: null,
    body: 'Hello',
    subject: null,
    created_at: '2026-01-01T12:00:00Z',
    ...overrides,
  };
}
