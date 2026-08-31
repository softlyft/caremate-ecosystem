import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listOrgConversations } from '@/domains/messaging/repository';
import { listConnectedPatients } from '@/domains/patients/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { OrgMessagesInbox } from '@/components/features/org-messages-inbox';
import { canWriteOrg } from '@/constants/roles';

export default async function BroadcastsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireModule('messaging');
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [conversations, patientsResult] = await Promise.all([
    listOrgConversations(orgId, { page }),
    listConnectedPatients(orgId, { page: 1, pageSize: 200, messagingConsent: true }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const patientOptions = patientsResult.rows.map((p) => ({
    id: p.connection.patient_id,
    label: `${p.profile?.full_name ?? 'Unknown'} (${p.profile?.patient_id ?? '—'})`,
  }));

  return (
    <OrgMessagesInbox
      description="Inbox-style messages to connected patients who have messaging consent. Broadcasts land in each patient's CareMate Messages inbox with a push notification."
      composeDescription="Send to patients with active messaging consent (all or selected)"
      canWrite={canWrite}
      patients={patientOptions}
      conversations={conversations}
      hrefForPage={(p) => hrefWithPage('/app/broadcasts', p)}
      threadHref={(id) => `/app/broadcasts/${id}`}
    />
  );
}
