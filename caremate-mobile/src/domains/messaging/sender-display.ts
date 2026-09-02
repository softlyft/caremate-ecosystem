import type { MessageConversation, MessageMessage } from '@/domains/messaging/repository';
import { supabase } from '@/lib/supabase';

export type MessageSenderDisplay = {
  name: string;
  roleLabel: string | null;
};

export type ThreadMessage = MessageMessage & {
  senderDisplay: MessageSenderDisplay | null;
};

export type SenderRoleLabels = {
  insurer: string;
  provider: string;
  participant: string;
  careTeam: string;
  you: string;
  unknownUser: string;
  insurerFallback: string;
  providerFallback: string;
};

export type ConversationHeaderLabels = {
  directFallback: string;
  coordinationFallback: string;
  providerFallback: string;
  insurerFallback: string;
  threadFallback: string;
};

export function isGroupConversation(conversation: MessageConversation | null | undefined): boolean {
  return conversation?.kind === 'care_coordination';
}

export function conversationHeaderTitle(
  conversation: MessageConversation | null | undefined,
  labels: ConversationHeaderLabels,
): string {
  if (!conversation) {
    return labels.threadFallback;
  }
  if (conversation.kind === 'direct') {
    return conversation.peer_name?.trim() || labels.directFallback;
  }
  if (conversation.kind === 'care_coordination') {
    return conversation.title?.trim() || labels.coordinationFallback;
  }
  const orgName = conversation.organization_name?.trim();
  if (orgName) {
    return orgName;
  }
  return conversation.org_side === 'payer' ? labels.insurerFallback : labels.providerFallback;
}

export function resolveMessageSenderDisplay(
  message: MessageMessage,
  input: {
    conversation: MessageConversation;
    userId: string;
    labels: SenderRoleLabels;
    profileNameById: ReadonlyMap<string, string | null>;
    providerName: string;
    payerName: string;
  },
): MessageSenderDisplay | null {
  if (input.conversation.kind !== 'care_coordination') {
    return null;
  }

  if (message.sender_party_type === 'organization') {
    if (message.sender_payer_organization_id) {
      return { name: input.payerName, roleLabel: input.labels.insurer };
    }
    if (message.sender_organization_id) {
      return { name: input.providerName, roleLabel: input.labels.provider };
    }
    return null;
  }

  const senderId = message.sender_user_id;
  if (!senderId) {
    return null;
  }

  if (senderId === input.userId) {
    return { name: input.labels.you, roleLabel: input.labels.participant };
  }

  const name = input.profileNameById.get(senderId)?.trim() || input.labels.unknownUser;
  const isPatient = senderId === input.conversation.patient_user_id;
  return {
    name,
    roleLabel: isPatient ? input.labels.participant : input.labels.careTeam,
  };
}

export async function enrichMessageSenders(
  messages: MessageMessage[],
  conversation: MessageConversation,
  userId: string,
  labels: SenderRoleLabels,
): Promise<ThreadMessage[]> {
  if (conversation.kind !== 'care_coordination') {
    return messages.map((message) => ({ ...message, senderDisplay: null }));
  }

  const userSenderIds = [
    ...new Set(
      messages
        .filter((m) => m.sender_party_type === 'user' && m.sender_user_id)
        .map((m) => m.sender_user_id as string),
    ),
  ];

  const { data: profiles } = userSenderIds.length
    ? await supabase.from('profiles').select('user_id, full_name').in('user_id', userSenderIds)
    : { data: [] as { user_id: string; full_name: string | null }[] };

  const profileNameById = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile.full_name?.trim() || null]),
  );

  const providerName = conversation.coordination_provider_name?.trim() || labels.providerFallback;
  const payerName = conversation.coordination_payer_name?.trim() || labels.insurerFallback;

  const context = {
    conversation,
    userId,
    labels,
    profileNameById,
    providerName,
    payerName,
  };

  return messages.map((message) => ({
    ...message,
    senderDisplay: resolveMessageSenderDisplay(message, context),
  }));
}

export async function loadConversationThread(
  conversationId: string,
  userId: string,
  labels: SenderRoleLabels,
): Promise<{ conversation: MessageConversation | null; messages: ThreadMessage[] }> {
  const { getConversation, listMessages } = await import('@/domains/messaging/repository');
  const [conversation, messages] = await Promise.all([
    getConversation(conversationId, userId),
    listMessages(conversationId),
  ]);

  if (!conversation) {
    return {
      conversation: null,
      messages: messages.map((message) => ({ ...message, senderDisplay: null })),
    };
  }

  const enriched = await enrichMessageSenders(messages, conversation, userId, labels);
  return { conversation, messages: enriched };
}
