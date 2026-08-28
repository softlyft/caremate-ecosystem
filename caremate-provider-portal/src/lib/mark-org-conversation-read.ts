import type { CareOrgKind } from '@/types/database';
import { createClient } from '@/lib/supabase/server';

/** Mark the org-side participant row as read for an org↔patient thread. */
export async function markOrgConversationRead(
  orgKind: CareOrgKind,
  organizationId: string,
  conversationId: string,
): Promise<void> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  let query = client
    .from('message_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('party_type', 'organization');

  if (orgKind === 'payer') {
    query = query.eq('payer_organization_id', organizationId);
  } else {
    query = query.eq('organization_id', organizationId);
  }

  await query;
}
