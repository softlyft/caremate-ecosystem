import type { MessageConversation } from '@/domains/messaging/repository';

type ConversationTitleInput = Pick<
  MessageConversation,
  | 'kind'
  | 'peer_name'
  | 'coordination_provider_name'
  | 'coordination_payer_name'
  | 'payer_organization_id'
  | 'org_side'
  | 'organization_name'
>;

export function buildConversationTitle(row: ConversationTitleInput): string {
  if (row.kind === 'direct') {
    return row.peer_name?.trim() || 'Direct message';
  }
  if (row.kind === 'care_coordination') {
    const provider = row.coordination_provider_name?.trim();
    const payer = row.coordination_payer_name?.trim();
    if (provider && payer) return `${provider} + ${payer}`;
    return provider || payer || 'Care coordination';
  }
  if (row.payer_organization_id || row.org_side === 'payer') {
    return row.organization_name?.trim() || 'Insurer';
  }
  return row.organization_name?.trim() || 'Provider';
}
