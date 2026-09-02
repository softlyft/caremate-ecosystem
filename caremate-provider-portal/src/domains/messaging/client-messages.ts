import { fetchOrgThreadMessagesAction } from '@/domains/messaging/fetch-org-thread-messages-action';

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
  return fetchOrgThreadMessagesAction(conversationId);
}
