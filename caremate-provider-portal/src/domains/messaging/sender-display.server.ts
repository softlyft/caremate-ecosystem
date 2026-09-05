import type { OrgThreadMessage } from '@/domains/messaging/client-messages';
import type { ThreadDisplayContext } from '@/domains/messaging/sender-display';
import { createClient } from '@/lib/supabase/server';

export async function loadProfileNamesForMessages(
  messages: OrgThreadMessage[],
): Promise<Record<string, string>> {
  const userIds = [
    ...new Set(
      messages
        .filter((message) => message.sender_party_type === 'user' && message.sender_user_id)
        .map((message) => message.sender_user_id as string),
    ),
  ];

  if (!userIds.length) {
    return {};
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);

  return Object.fromEntries(
    (data ?? []).map((profile: { user_id: string; full_name: string | null }) => [
      profile.user_id,
      profile.full_name?.trim() || 'Care team member',
    ]),
  );
}

export async function buildThreadDisplayContext(input: {
  conversationKind: 'org_patient' | 'care_coordination';
  patientUserId: string | null;
  patientName: string | null;
  providerOrgName: string;
  payerOrgName: string;
  messages: OrgThreadMessage[];
}): Promise<ThreadDisplayContext> {
  const profileNamesByUserId = await loadProfileNamesForMessages(input.messages);
  return {
    conversationKind: input.conversationKind,
    patientUserId: input.patientUserId,
    patientName: input.patientName,
    providerOrgName: input.providerOrgName,
    payerOrgName: input.payerOrgName,
    profileNamesByUserId,
  };
}
