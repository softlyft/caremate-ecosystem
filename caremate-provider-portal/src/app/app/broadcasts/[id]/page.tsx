import { notFound } from 'next/navigation';
import { requireProviderSession } from '@/lib/auth';
import {
  getOrgConversation,
  listConversationMessages,
} from '@/domains/messaging/repository';
import { markOrgConversationRead } from '@/lib/mark-org-conversation-read';
import { canWriteOrg } from '@/constants/roles';
import { OrgMessageThread } from '@/components/features/org-message-thread';

export default async function BroadcastThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const canWrite = canWriteOrg(session.activeRole);

  const conversation = await getOrgConversation(orgId, id);
  if (!conversation) notFound();

  const messages = await listConversationMessages(orgId, id);
  await markOrgConversationRead('provider', orgId, id);

  return (
    <OrgMessageThread
      inboxHref="/app/broadcasts"
      patientName={conversation.patient_name}
      patientCaremateId={conversation.patient_caremate_id}
      messages={messages}
      orgSenderLabel="Clinic"
      canWrite={canWrite}
      conversationId={id}
    />
  );
}
