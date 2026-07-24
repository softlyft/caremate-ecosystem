import { config } from '@/constants/env';
import { supabase } from '@/lib/supabase';

/** Untyped access until messaging RPCs are fully reflected in `@caremate/db-types`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type MessageConversation = {
  id: string;
  kind: 'org_patient' | 'direct';
  organization_id: string | null;
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
};

export type MessageMessage = {
  id: string;
  conversation_id: string;
  sender_party_type: 'user' | 'organization';
  sender_user_id: string | null;
  sender_organization_id: string | null;
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

function conversationTitle(row: MessageConversation): string {
  if (row.kind === 'direct') {
    return row.peer_name?.trim() || 'Direct message';
  }
  return row.organization_name?.trim() || 'Provider';
}

export async function listPatientConversations(userId: string): Promise<MessageConversation[]> {
  if (!config.isSupabaseConfigured) return [];

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
  const readByConv = new Map(myParticipation.map((p) => [p.conversation_id, p.last_read_at]));

  const { data, error } = await db
    .from('message_conversations')
    .select('*')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as ConversationRow[];
  if (!rows.length) return [];

  const orgIds = [
    ...new Set(rows.map((r) => r.organization_id).filter(Boolean) as string[]),
  ];
  const directIds = rows.filter((r) => r.kind === 'direct').map((r) => r.id);

  const [{ data: orgs }, { data: allParticipants }] = await Promise.all([
    orgIds.length
      ? supabase.from('provider_organizations').select('id, name').in('id', orgIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    directIds.length
      ? db
          .from('message_participants')
          .select('conversation_id, user_id')
          .eq('party_type', 'user')
          .in('conversation_id', directIds)
      : Promise.resolve({
          data: [] as { conversation_id: string; user_id: string }[],
        }),
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
    const enriched: MessageConversation = {
      ...row,
      organization_name: row.organization_id
        ? (orgNameById.get(row.organization_id) ?? null)
        : null,
      peer_user_id: peerUserId,
      peer_name: peerUserId ? (peerNameById.get(peerUserId) ?? null) : null,
      unread,
    };
    enriched.title = conversationTitle(enriched);
    return enriched;
  });
}

export async function countUnreadConversations(userId: string): Promise<number> {
  const list = await listPatientConversations(userId);
  return list.filter((c) => c.unread).length;
}

export async function listMessages(conversationId: string): Promise<MessageMessage[]> {
  if (!config.isSupabaseConfigured) return [];
  const { data, error } = await db
    .from('message_messages')
    .select(
      'id, conversation_id, sender_party_type, sender_user_id, sender_organization_id, body, subject, created_at',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageMessage[];
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

export async function startDirectConversation(input: {
  otherUserId: string;
  organizationId: string;
  body?: string | null;
}): Promise<{ conversationId: string; message: MessageMessage | null }> {
  if (!config.isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }
  const { data, error } = await db.rpc('start_direct_conversation', {
    p_other_user_id: input.otherUserId,
    p_organization_id: input.organizationId,
    p_body: input.body?.trim() || null,
  });
  if (error) throw error;

  const payload = data as {
    conversation_id: string;
    message: MessageMessage | null;
  };
  if (payload.message?.id) {
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
