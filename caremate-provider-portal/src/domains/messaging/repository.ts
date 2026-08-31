import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import {
  gatewayRequest,
  isHealthDataGatewayConfigured,
} from '@/lib/health-data-gateway';
import type { Json } from '@/types/database';

export type MessageConversation = {
  id: string;
  kind: 'org_patient' | 'direct' | 'care_coordination';
  organization_id: string | null;
  payer_organization_id?: string | null;
  patient_user_id: string | null;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
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
  metadata: Json;
  created_at: string;
};

export type OrgInboxRow = MessageConversation & {
  patient_name: string | null;
  patient_caremate_id: string | null;
  partner_org_name: string | null;
  unread: boolean;
};

/** Messaging tables land ahead of regenerated Database types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db(): Promise<any> {
  return createClient();
}

async function enrichOrgInboxRows(
  organizationId: string,
  rows: MessageConversation[],
): Promise<OrgInboxRow[]> {
  if (!rows.length) return [];

  const supabase = await db();
  const patientIds = rows.map((r) => r.patient_user_id).filter(Boolean) as string[];
  const conversationIds = rows.map((r) => r.id);
  const payerPartnerIds = [
    ...new Set(
      rows
        .filter((r) => r.kind === 'care_coordination')
        .map((r) => r.payer_organization_id)
        .filter(Boolean) as string[],
    ),
  ];

  const [{ data: profiles }, { data: participants }, { data: payerPartners }] = await Promise.all([
    supabase.from('profiles').select('user_id, full_name, patient_id').in('user_id', patientIds),
    supabase
      .from('message_participants')
      .select('conversation_id, last_read_at')
      .eq('party_type', 'organization')
      .eq('organization_id', organizationId)
      .in('conversation_id', conversationIds),
    payerPartnerIds.length
      ? supabase.from('payer_organizations').select('id, name').in('id', payerPartnerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const profileByUser = new Map(
    (profiles ?? []).map((p: { user_id: string; full_name: string; patient_id: string | null }) => [
      p.user_id,
      p,
    ]),
  );
  const readByConv = new Map(
    (participants ?? []).map((p: { conversation_id: string; last_read_at: string | null }) => [
      p.conversation_id,
      p.last_read_at,
    ]),
  );
  const payerNameById = new Map<string, string>(
    (payerPartners ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  return rows.map((row) => {
    const profile = row.patient_user_id
      ? (profileByUser.get(row.patient_user_id) as
          | { full_name: string; patient_id: string | null }
          | undefined)
      : undefined;
    const lastRead = readByConv.get(row.id) as string | null | undefined;
    const unread = Boolean(
      row.last_message_at && (!lastRead || new Date(row.last_message_at) > new Date(lastRead)),
    );
    return {
      ...row,
      patient_name: profile?.full_name ?? null,
      patient_caremate_id: profile?.patient_id ?? null,
      partner_org_name:
        row.kind === 'care_coordination' && row.payer_organization_id
          ? (payerNameById.get(row.payer_organization_id) ?? null)
          : null,
      unread,
    };
  });
}

export async function listOrgConversations(
  organizationId: string,
  options?: { page?: number; pageSize?: number },
): Promise<PaginatedResult<OrgInboxRow>> {
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);
  const supabase = await db();

  const gatewayRows = await gatewayRequest<MessageConversation[]>(
    'GET',
    `/v1/messages/conversations?organizationId=${encodeURIComponent(organizationId)}`,
  );

  if (gatewayRows) {
    const sorted = [...gatewayRows].sort((a, b) => {
      const aTs = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTs = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTs - aTs;
    });
    const slice = sorted.slice(from, to + 1);
    const enriched = await enrichOrgInboxRows(organizationId, slice);
    return paginatedResult(enriched, sorted.length, page, pageSize);
  }

  if (isHealthDataGatewayConfigured()) {
    return emptyPage(page, pageSize);
  }

  const { data, error, count } = await supabase
    .from('message_conversations')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .in('kind', ['org_patient', 'care_coordination'])
    .order('last_message_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  const rows = (data ?? []) as MessageConversation[];
  if (!rows.length) return emptyPage(page, pageSize);

  const enriched = await enrichOrgInboxRows(organizationId, rows);
  return paginatedResult(enriched, count, page, pageSize);
}

export async function getOrgConversation(
  organizationId: string,
  conversationId: string,
): Promise<OrgInboxRow | null> {
  const supabase = await db();

  const gatewayRows = await gatewayRequest<MessageConversation[]>(
    'GET',
    `/v1/messages/conversations?organizationId=${encodeURIComponent(organizationId)}`,
  );

  if (gatewayRows) {
    const row = gatewayRows.find((r) => r.id === conversationId);
    if (!row) return null;
    const [enriched] = await enrichOrgInboxRows(organizationId, [row]);
    return enriched ?? null;
  }

  if (isHealthDataGatewayConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('message_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('organization_id', organizationId)
    .in('kind', ['org_patient', 'care_coordination'])
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [enriched] = await enrichOrgInboxRows(organizationId, [data as MessageConversation]);
  return enriched ?? null;
}

export async function listConversationMessages(
  organizationId: string,
  conversationId: string,
): Promise<MessageMessage[]> {
  const gatewayRows = await gatewayRequest<MessageMessage[]>(
    'GET',
    `/v1/messages/conversations/${conversationId}`,
  );
  if (gatewayRows) {
    return gatewayRows;
  }
  if (isHealthDataGatewayConfigured()) {
    return [];
  }

  const supabase = await db();
  const { data: conversation, error: convError } = await supabase
    .from('message_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (convError) throw convError;
  if (!conversation) return [];

  const { data, error } = await supabase
    .from('message_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageMessage[];
}

export async function sendOrgMessage(input: {
  organizationId: string;
  body: string;
  subject?: string | null;
  audience: 'all' | 'selected';
  patientIds?: string[];
  expiresAt?: string | null;
}): Promise<{ messageIds: string[]; recipientCount: number }> {
  const supabase = await db();
  const { data, error } = await supabase.rpc('send_provider_org_message', {
    p_organization_id: input.organizationId,
    p_body: input.body,
    p_subject: input.subject ?? undefined,
    p_audience: input.audience,
    p_patient_ids: input.audience === 'selected' ? input.patientIds : undefined,
    p_expires_at: input.expiresAt ?? undefined,
  });

  if (error) throw error;

  const payload = data as {
    message_ids?: string[];
    recipient_count?: number;
  };

  const messageIds = payload.message_ids ?? [];
  if (messageIds.length) {
    await gatewayRequest('POST', '/v1/messages/seal', { message_ids: messageIds });
  }
  await notifyPatientPush(supabase, input.organizationId, messageIds);

  return {
    messageIds,
    recipientCount: payload.recipient_count ?? messageIds.length,
  };
}

async function notifyPatientPush(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  organizationId: string,
  messageIds: string[],
) {
  if (!messageIds.length) return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    await fetch(`${url}/functions/v1/notify-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId,
        messageIds,
      }),
    });
  } catch {
    // Push is best-effort.
  }
}

export async function replyOrgMessage(input: {
  organizationId: string;
  conversationId: string;
  body: string;
}): Promise<MessageMessage> {
  const supabase = await db();
  const { data, error } = await supabase.rpc('post_org_message', {
    p_conversation_id: input.conversationId,
    p_body: input.body,
  });
  if (error) throw error;

  const message = data as MessageMessage;
  if (message?.sender_organization_id !== input.organizationId) {
    throw new Error('Conversation does not belong to this organization');
  }

  if (message?.id) {
    await gatewayRequest('POST', '/v1/messages/seal', { message_ids: [message.id] });
  }

  await notifyPatientPush(supabase, input.organizationId, [message.id]);
  return message;
}
