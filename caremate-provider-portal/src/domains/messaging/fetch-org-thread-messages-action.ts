'use server';

import { createClient } from '@/lib/supabase/server';
import {
  gatewayRequest,
  isHealthDataGatewayConfigured,
} from '@/lib/health-data-gateway';
import type { OrgThreadMessage } from '@/domains/messaging/client-messages';

type GatewayMessageRow = {
  id: string;
  sender_party_type: 'user' | 'organization';
  sender_user_id?: string | null;
  sender_organization_id?: string | null;
  sender_payer_organization_id?: string | null;
  body: string;
  subject: string | null;
  created_at: string;
};

function mapGatewayRows(rows: GatewayMessageRow[]): OrgThreadMessage[] {
  return rows.map((row) => ({
    id: row.id,
    sender_party_type: row.sender_party_type,
    sender_user_id: row.sender_user_id ?? null,
    sender_organization_id: row.sender_organization_id ?? null,
    sender_payer_organization_id: row.sender_payer_organization_id ?? null,
    body: row.body,
    subject: row.subject,
    created_at: row.created_at,
  }));
}

/** Server-side thread refresh for Realtime updates (gateway decrypt + RLS fallback). */
export async function fetchOrgThreadMessagesAction(
  conversationId: string,
): Promise<OrgThreadMessage[]> {
  const gatewayRows = await gatewayRequest<GatewayMessageRow[]>(
    'GET',
    `/v1/messages/conversations/${conversationId}`,
  );
  if (gatewayRows) {
    return mapGatewayRows(gatewayRows);
  }

  if (isHealthDataGatewayConfigured()) {
    return [];
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client
    .from('message_messages')
    .select(
      'id, sender_party_type, sender_user_id, sender_organization_id, sender_payer_organization_id, body, subject, created_at',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as OrgThreadMessage[];
}
