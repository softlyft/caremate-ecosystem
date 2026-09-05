import type { OrgThreadMessage } from '@/domains/messaging/client-messages';

export type MessageSenderDisplay = {
  name: string;
  roleLabel: string | null;
};

export type EnrichedOrgThreadMessage = OrgThreadMessage & {
  senderDisplay: MessageSenderDisplay | null;
};

export type ThreadDisplayContext = {
  conversationKind: 'org_patient' | 'care_coordination';
  patientUserId: string | null;
  patientName: string | null;
  providerOrgName: string;
  payerOrgName: string;
  profileNamesByUserId: Record<string, string>;
};

const ROLE = {
  provider: 'provider',
  insurer: 'insurer',
  participant: 'participant',
  careTeam: 'care team',
  patient: 'patient',
} as const;

export function portalThreadHeaderTitle(input: {
  conversationKind: 'org_patient' | 'care_coordination';
  patientName: string | null;
  providerOrgName: string;
  payerOrgName: string;
}): string {
  if (input.conversationKind === 'care_coordination') {
    return [input.providerOrgName, input.payerOrgName].filter(Boolean).join(' + ');
  }
  return input.patientName?.trim() || 'Patient';
}

export function isGroupThread(context: ThreadDisplayContext): boolean {
  return context.conversationKind === 'care_coordination';
}

export function resolvePortalSenderDisplay(
  message: OrgThreadMessage,
  context: ThreadDisplayContext,
): MessageSenderDisplay | null {
  if (context.conversationKind !== 'care_coordination') {
    return null;
  }

  if (message.sender_party_type === 'organization') {
    if (message.sender_payer_organization_id) {
      return { name: context.payerOrgName, roleLabel: ROLE.insurer };
    }
    if (message.sender_organization_id) {
      return { name: context.providerOrgName, roleLabel: ROLE.provider };
    }
    return null;
  }

  const senderId = message.sender_user_id;
  if (!senderId) {
    return null;
  }

  if (context.patientUserId && senderId === context.patientUserId) {
    return {
      name: context.patientName?.trim() || 'Patient',
      roleLabel: ROLE.participant,
    };
  }

  const name = context.profileNamesByUserId[senderId]?.trim() || 'Care team member';
  return { name, roleLabel: ROLE.careTeam };
}

export function enrichOrgThreadMessages(
  messages: OrgThreadMessage[],
  context: ThreadDisplayContext,
): EnrichedOrgThreadMessage[] {
  return messages.map((message) => ({
    ...message,
    senderDisplay: resolvePortalSenderDisplay(message, context),
  }));
}
