import { notFound } from 'next/navigation';
import { requirePayerSession } from '@/lib/auth';
import {
  getPayerOrgConversation,
  listPayerConversationMessages,
} from '@/domains/payer-messaging/repository';
import { replyPayerOrgMessageAction } from '@/domains/payer-messaging/actions';
import { markOrgConversationRead } from '@/lib/mark-org-conversation-read';
import { canWriteOrg } from '@/constants/roles';
import { OrgMessageThread } from '@/components/features/org-message-thread';

export default async function PayerBroadcastThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePayerSession();
  const orgId = session.activeOrganizationId;
  const canWrite = canWriteOrg(session.activeRole);

  const conversation = await getPayerOrgConversation(orgId, id);
  if (!conversation) notFound();

  const messages = await listPayerConversationMessages(orgId, id);
  await markOrgConversationRead('payer', orgId, id);

  return (
    <OrgMessageThread
      inboxHref="/payer/broadcasts"
      patientName={conversation.patient_name}
      patientCaremateId={conversation.patient_caremate_id}
      messages={messages}
      orgSenderLabel="Insurer"
      canWrite={canWrite}
      conversationId={id}
      replyAction={replyPayerOrgMessageAction}
    />
  );
}
