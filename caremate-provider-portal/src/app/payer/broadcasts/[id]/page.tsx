import { notFound } from 'next/navigation';
import { requirePayerSession } from '@/lib/auth';
import {
  getPayerOrgConversation,
  listPayerConversationMessages,
} from '@/domains/payer-messaging/repository';
import { listCareCoordinationStaffCandidates } from '@/domains/messaging/care-coordination';
import { addPayerCareCoordinationStaffAction } from '@/domains/payer-messaging/care-coordination-actions';
import { replyPayerOrgMessageAction } from '@/domains/payer-messaging/actions';
import { buildThreadDisplayContext } from '@/domains/messaging/sender-display';
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

  const [messages, staffCandidates] = await Promise.all([
    listPayerConversationMessages(orgId, id),
    conversation.kind === 'care_coordination' && canWrite
      ? listCareCoordinationStaffCandidates(id)
      : Promise.resolve([]),
  ]);
  await markOrgConversationRead('payer', orgId, id);

  const conversationKind =
    conversation.kind === 'care_coordination' ? 'care_coordination' : 'org_patient';

  const threadContext = await buildThreadDisplayContext({
    conversationKind,
    patientUserId: conversation.patient_user_id,
    patientName: conversation.patient_name,
    providerOrgName: conversation.partner_org_name ?? 'Provider',
    payerOrgName: session.activeOrganizationName,
    messages,
  });

  return (
    <OrgMessageThread
      inboxHref="/payer/broadcasts"
      patientName={conversation.patient_name}
      patientCaremateId={conversation.patient_caremate_id}
      messages={messages}
      canWrite={canWrite}
      conversationId={id}
      threadContext={threadContext}
      staffCandidates={staffCandidates}
      addStaffAction={addPayerCareCoordinationStaffAction}
      replyAction={replyPayerOrgMessageAction}
    />
  );
}
