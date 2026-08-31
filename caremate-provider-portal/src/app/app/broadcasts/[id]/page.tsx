import { notFound } from 'next/navigation';
import { requireProviderSession } from '@/lib/auth';
import {
  getOrgConversation,
  listConversationMessages,
} from '@/domains/messaging/repository';
import { listCareCoordinationStaffCandidates } from '@/domains/messaging/care-coordination';
import { addCareCoordinationStaffAction } from '@/domains/messaging/care-coordination-actions';
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

  const [messages, staffCandidates] = await Promise.all([
    listConversationMessages(orgId, id),
    conversation.kind === 'care_coordination' && canWrite
      ? listCareCoordinationStaffCandidates(id)
      : Promise.resolve([]),
  ]);
  await markOrgConversationRead('provider', orgId, id);

  return (
    <OrgMessageThread
      inboxHref="/app/broadcasts"
      patientName={conversation.patient_name}
      patientCaremateId={conversation.patient_caremate_id}
      messages={messages}
      orgSenderLabel="Clinic"
      payerSenderLabel="Insurer"
      canWrite={canWrite}
      conversationId={id}
      conversationKind={conversation.kind === 'care_coordination' ? 'care_coordination' : 'org_patient'}
      partnerOrgName={conversation.partner_org_name}
      staffCandidates={staffCandidates}
      addStaffAction={addCareCoordinationStaffAction}
    />
  );
}
