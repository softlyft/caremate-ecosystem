import { createClient } from '@/lib/supabase/browser';

export type OrgThreadMessage = {
  id: string;
  sender_party_type: 'user' | 'organization';
  sender_user_id?: string | null;
  sender_organization_id?: string | null;
  sender_payer_organization_id?: string | null;
  body: string;
  subject: string | null;
  created_at: string;
};

export async function fetchOrgThreadMessages(conversationId: string): Promise<OrgThreadMessage[]> {
  const supabase = createClient();
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
