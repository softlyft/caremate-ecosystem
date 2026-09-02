import { config } from '@/constants/env';
import { buildConversationTitle } from '@/domains/messaging/conversation-display';
import { requireRpcConversationId, throwIfRpcError } from '@/domains/messaging/errors';
import {
  fetchConversationsViaGateway,
  fetchMessagesViaGateway,
  isHealthDataGatewayConfigured,
  postMessageReplyViaGateway,
  scrubEncryptedText,
  sealMessagesViaGateway,
} from '@/domains/health-data-gateway';
import { extractErrorMessage } from '@/lib/user-facing-error';
import { supabase } from '@/lib/supabase';

/** Untyped access until messaging RPCs are fully reflected in `@caremate/db-types`. */
const db = supabase as any;

export type OrgSide = 'provider' | 'payer';

export type MessageConversation = {
  id: string;
  kind: 'org_patient' | 'direct' | 'care_coordination';
  organization_id: string | null;
  payer_organization_id?: string | null;
  org_side?: OrgSide | null;
  patient_user_id: string | null;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  organization_name?: string | null;
  peer_user_id?: string | null;
  peer_name?: string | null;
  title?: string;
  unread?: boolean;
  coordination_provider_name?: string | null;
  coordination_payer_name?: string | null;
};

export type MessageMessage = {
  id: string;
  conversation_id: string;
  sender_party_type: 'user' | 'organization';
  sender_user_id: string | null;
  sender_organization_id: string | null;
  sender_payer_organization_id?: string | null;
  body: string;
  subject: string | null;
  created_at: string;
};

export type MessageableUser = {
  user_id: string;
  full_name: string;
  patient_id: string | null;
  organization_id: string;
  organization_name: string;
  is_practitioner: boolean;
};

type ConversationRow = Omit<
  MessageConversation,
  'organization_name' | 'peer_user_id' | 'peer_name' | 'title' | 'unread'
>;

/** @deprecated Use helpers from `@/domains/messaging/errors` in UI code. */
export function patientMessageErrorKey(error: unknown): string {
  const message = extractErrorMessage(error);
  if (/not connected to this payer/i.test(message)) {
    return 'messages.payerNotConnected';
  }
  if (/messaging consent required/i.test(message)) {
    return 'messages.messagingConsentRequired';
  }
  return 'messages.sendFailedMessage';
}

export {
  careCoordinationErrorKey,
  formatCareCoordinationAlert,
  formatCareCoordinationLoadAlert,
  formatCareTeamMessageAlert,
  formatDirectMessageStartAlert,
  formatOrgInboxMessageAlert,
} from '@/domains/messaging/errors';

function parseJsonObject(data: unknown): Record<string, unknown> {
  if (typeof data === 'string') {
    return JSON.parse(data) as Record<string, unknown>;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  throw new Error('Invalid response');
}

export async function listPatientConversations(userId: string): Promise<MessageConversation[]> {
  if (!config.isSupabaseConfigured) return [];

  const gatewayRows = await fetchConversationsViaGateway();
  let rows: ConversationRow[] = [];

  if (gatewayRows) {
    rows = gatewayRows.map((row) => ({
      ...row,
      last_message_preview: scrubEncryptedText(row.last_message_preview),
      subject: scrubEncryptedText(row.subject),
    }));
  } else if (isHealthDataGatewayConfigured()) {
    return [];
  } else {
    const { data: participantRows, error: participantError } = await db
      .from('message_participants')
      .select('conversation_id, last_read_at')
      .eq('party_type', 'user')
      .eq('user_id', userId);

    if (participantError) throw participantError;
    const myParticipation = (participantRows ?? []) as {
      conversation_id: string;
      last_read_at: string | null;
    }[];
    if (!myParticipation.length) return [];

    const conversationIds = myParticipation.map((p) => p.conversation_id);

    const { data, error } = await db
      .from('message_conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    rows = ((data ?? []) as ConversationRow[]).map((row) => ({
      ...row,
      last_message_preview: scrubEncryptedText(row.last_message_preview),
      subject: scrubEncryptedText(row.subject),
    }));
  }

  if (!rows.length) return [];

  const { data: participantRows } = await db
    .from('message_participants')
    .select('conversation_id, last_read_at')
    .eq('party_type', 'user')
    .eq('user_id', userId);
  const myParticipation = (participantRows ?? []) as {
    conversation_id: string;
    last_read_at: string | null;
  }[];
  const readByConv = new Map(myParticipation.map((p) => [p.conversation_id, p.last_read_at]));

  const providerOrgIds = [
    ...new Set(rows.map((r) => r.organization_id).filter(Boolean) as string[]),
  ];
  const payerOrgIds = [
    ...new Set(rows.map((r) => r.payer_organization_id).filter(Boolean) as string[]),
  ];
  const directIds = rows.filter((r) => r.kind === 'direct').map((r) => r.id);
  const coordinationProviderIds = [
    ...new Set(
      rows
        .filter((r) => r.kind === 'care_coordination')
        .map((r) => r.organization_id)
        .filter(Boolean) as string[],
    ),
  ];
  const coordinationPayerIds = [
    ...new Set(
      rows
        .filter((r) => r.kind === 'care_coordination')
        .map((r) => r.payer_organization_id)
        .filter(Boolean) as string[],
    ),
  ];

  const [
    { data: orgs },
    { data: payers },
    { data: allParticipants },
    { data: coordProviders },
    { data: coordPayers },
  ] = await Promise.all([
    providerOrgIds.length
      ? supabase.from('provider_organizations').select('id, name').in('id', providerOrgIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    payerOrgIds.length
      ? supabase.from('payer_directory').select('id, name').in('id', payerOrgIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    directIds.length
      ? db
          .from('message_participants')
          .select('conversation_id, user_id')
          .eq('party_type', 'user')
          .in('conversation_id', directIds)
      : Promise.resolve({
          data: [] as { conversation_id: string; user_id: string }[],
        }),
    coordinationProviderIds.length
      ? supabase.from('provider_organizations').select('id, name').in('id', coordinationProviderIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    coordinationPayerIds.length
      ? supabase.from('payer_directory').select('id, name').in('id', coordinationPayerIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ]);

  const peerIds = [
    ...new Set(
      ((allParticipants ?? []) as { conversation_id: string; user_id: string }[])
        .filter((p) => p.user_id !== userId)
        .map((p) => p.user_id),
    ),
  ];

  const { data: peerProfiles } = peerIds.length
    ? await supabase.from('profiles').select('user_id, full_name').in('user_id', peerIds)
    : { data: [] as { user_id: string; full_name: string }[] };

  const orgNameById = new Map(
    (orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]),
  );
  const payerNameById = new Map(
    (payers ?? [])
      .filter((p): p is { id: string; name: string } => Boolean(p.id && p.name))
      .map((p) => [p.id, p.name]),
  );
  const coordProviderNameById = new Map(
    (coordProviders ?? []).map((o: { id: string; name: string }) => [o.id, o.name]),
  );
  const coordPayerNameById = new Map(
    (coordPayers ?? [])
      .filter((p): p is { id: string; name: string } => Boolean(p.id && p.name))
      .map((p) => [p.id, p.name]),
  );
  const peerNameById = new Map(
    (peerProfiles ?? []).map((p: { user_id: string; full_name: string }) => [
      p.user_id,
      p.full_name,
    ]),
  );
  const peerByConversation = new Map<string, string>();
  for (const p of (allParticipants ?? []) as { conversation_id: string; user_id: string }[]) {
    if (p.user_id === userId) continue;
    if (!peerByConversation.has(p.conversation_id)) {
      peerByConversation.set(p.conversation_id, p.user_id);
    }
  }

  return rows.map((row) => {
    const lastRead = readByConv.get(row.id);
    const unread = Boolean(
      row.last_message_at && (!lastRead || new Date(row.last_message_at) > new Date(lastRead)),
    );
    const peerUserId = row.kind === 'direct' ? (peerByConversation.get(row.id) ?? null) : null;
    const isPayerOrg = Boolean(row.payer_organization_id);
    const enriched: MessageConversation = {
      ...row,
      payer_organization_id: row.payer_organization_id ?? null,
      org_side:
        row.kind === 'org_patient'
          ? isPayerOrg
            ? 'payer'
            : row.organization_id
              ? 'provider'
              : null
          : null,
      organization_name: isPayerOrg
        ? (payerNameById.get(row.payer_organization_id!) ?? null)
        : row.organization_id
          ? (orgNameById.get(row.organization_id) ?? null)
          : null,
      coordination_provider_name:
        row.kind === 'care_coordination' && row.organization_id
          ? (coordProviderNameById.get(row.organization_id) ?? null)
          : null,
      coordination_payer_name:
        row.kind === 'care_coordination' && row.payer_organization_id
          ? (coordPayerNameById.get(row.payer_organization_id) ?? null)
          : null,
      peer_user_id: peerUserId,
      peer_name: peerUserId ? (peerNameById.get(peerUserId) ?? null) : null,
      unread,
    };
    enriched.title = buildConversationTitle(enriched);
    return enriched;
  });
}

export async function listMessages(conversationId: string): Promise<MessageMessage[]> {
  if (!config.isSupabaseConfigured) return [];

  const gatewayRows = await fetchMessagesViaGateway(conversationId);
  if (gatewayRows) {
    return gatewayRows.map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender_party_type: row.sender_party_type,
      sender_user_id: row.sender_user_id,
      sender_organization_id: row.sender_organization_id,
      sender_payer_organization_id: row.sender_payer_organization_id ?? null,
      body: scrubEncryptedText(row.body) ?? '',
      subject: scrubEncryptedText(row.subject),
      created_at: row.created_at,
    }));
  }
  if (isHealthDataGatewayConfigured()) {
    return [];
  }

  const { data, error } = await db
    .from('message_messages')
    .select(
      'id, conversation_id, sender_party_type, sender_user_id, sender_organization_id, sender_payer_organization_id, body, subject, created_at',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MessageMessage[]).map((row) => ({
    ...row,
    body: scrubEncryptedText(row.body) ?? '',
    subject: scrubEncryptedText(row.subject),
  }));
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  if (!config.isSupabaseConfigured) return;
  await db
    .from('message_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('party_type', 'user')
    .eq('user_id', userId);
}

export async function sendPatientReply(
  conversationId: string,
  body: string,
): Promise<MessageMessage> {
  if (!config.isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const gatewayMessage = await postMessageReplyViaGateway(conversationId, body);
  if (gatewayMessage) {
    const message: MessageMessage = {
      id: gatewayMessage.id,
      conversation_id: gatewayMessage.conversation_id,
      sender_party_type: gatewayMessage.sender_party_type,
      sender_user_id: gatewayMessage.sender_user_id,
      sender_organization_id: gatewayMessage.sender_organization_id,
      sender_payer_organization_id: gatewayMessage.sender_payer_organization_id ?? null,
      body: gatewayMessage.body,
      subject: gatewayMessage.subject,
      created_at: gatewayMessage.created_at,
    };
    void notifyDirectMessagePush([message.id]);
    return message;
  }

  const { data, error } = await db.rpc('post_patient_message', {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw error;
  const message = data as MessageMessage;
  void notifyDirectMessagePush([message.id]);
  return message;
}

export async function searchMessageableUsers(query: string): Promise<MessageableUser[]> {
  if (!config.isSupabaseConfigured) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await db.rpc('search_messageable_users', {
    p_query: trimmed,
    p_organization_id: null,
    p_limit: 20,
  });
  if (error) throw error;
  return (data ?? []) as MessageableUser[];
}

export async function openOrgPatientConversation(input: {
  organizationId: string;
  orgKind: OrgSide;
}): Promise<{ conversationId: string }> {
  if (!config.isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await db.rpc('open_patient_org_conversation', {
    p_org_kind: input.orgKind,
    p_org_id: input.organizationId,
  });
  throwIfRpcError(error, 'Could not open organization conversation');

  const payload = parseJsonObject(data);
  const conversationId = requireRpcConversationId(payload, 'open_patient_org_conversation');
  return { conversationId };
}

export async function startDirectConversation(input: {
  otherUserId: string;
  organizationId: string;
  orgKind?: OrgSide;
  body?: string | null;
}): Promise<{ conversationId: string; message: MessageMessage | null }> {
  if (!config.isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }
  const { data, error } = await db.rpc('start_direct_conversation', {
    p_other_user_id: input.otherUserId,
    p_organization_id: input.organizationId,
    p_body: input.body?.trim() || null,
    p_org_kind: input.orgKind ?? 'provider',
  });
  throwIfRpcError(error, 'Could not start direct conversation');

  const payload = data as {
    conversation_id: string;
    message: MessageMessage | null;
  };
  if (payload.message?.id) {
    await sealMessagesViaGateway([payload.message.id]);
    void notifyDirectMessagePush([payload.message.id]);
  }
  return {
    conversationId: payload.conversation_id,
    message: payload.message,
  };
}

export async function getConversation(
  conversationId: string,
  userId: string,
): Promise<MessageConversation | null> {
  const list = await listPatientConversations(userId);
  return list.find((c) => c.id === conversationId) ?? null;
}

export type CareCoordinationCandidate = {
  organization_id: string;
  org_kind: 'provider' | 'payer';
  organization_name: string;
};

export async function listCareCoordinationCandidates(
  sourceConversationId: string,
): Promise<CareCoordinationCandidate[]> {
  if (!config.isSupabaseConfigured) return [];

  const { data, error } = await db.rpc('list_care_coordination_candidates', {
    p_source_conversation_id: sourceConversationId,
  });
  throwIfRpcError(error, 'Could not load care coordination candidates');
  return (data ?? []) as CareCoordinationCandidate[];
}

export async function startCareCoordinationConversation(input: {
  sourceConversationId: string;
  candidate: CareCoordinationCandidate;
}): Promise<string> {
  if (!config.isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await db.rpc('start_care_coordination_from_source', {
    p_source_conversation_id: input.sourceConversationId,
    p_other_organization_id: input.candidate.organization_id,
  });
  throwIfRpcError(error, 'Could not start care coordination conversation');

  const payload = parseJsonObject(data);
  return requireRpcConversationId(payload, 'start_care_coordination_from_source');
}

async function notifyDirectMessagePush(messageIds: string[]): Promise<void> {
  if (!config.isSupabaseConfigured || messageIds.length === 0) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch(`${config.supabaseUrl}/functions/v1/notify-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'direct', messageIds }),
    });
  } catch {
    // best-effort push
  }
}
