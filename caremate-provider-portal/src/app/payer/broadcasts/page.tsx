import { requirePayerSession } from '@/lib/auth';
import { listPayerOrgConversations } from '@/domains/payer-messaging/repository';
import { listPatientPayerConnectionsByStatus } from '@/domains/patient-payer-connections/repository';
import { sendPayerBroadcastAction } from '@/domains/payer-messaging/actions';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { OrgMessagesInbox } from '@/components/features/org-messages-inbox';
import { canWriteOrg } from '@/constants/roles';

export default async function PayerBroadcastsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePayerSession();
  const orgId = session.activeOrganizationId;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [conversations, patientsResult] = await Promise.all([
    listPayerOrgConversations(orgId, { page }),
    listPatientPayerConnectionsByStatus(orgId, 'approved', { page: 1, pageSize: 200 }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const patientOptions = patientsResult.rows.map((p) => ({
    id: p.patient_id,
    label: `${p.profile?.full_name ?? 'Unknown'} (${p.profile?.patient_id ?? '—'})`,
  }));

  return (
    <OrgMessagesInbox
      description="Inbox-style messages to connected patients. Broadcasts land in each patient's CareMate Messages inbox with a push notification."
      canWrite={canWrite}
      patients={patientOptions}
      conversations={conversations}
      hrefForPage={(p) => hrefWithPage('/payer/broadcasts', p)}
      threadHref={(id) => `/payer/broadcasts/${id}`}
      sendAction={sendPayerBroadcastAction}
    />
  );
}
