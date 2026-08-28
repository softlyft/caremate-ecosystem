import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listDocuments } from '@/domains/documents/repository';
import { listConnectedPatients } from '@/domains/patients/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { OrgDocumentsPanel } from '@/components/features/org-documents-panel';
import { canWriteOrg } from '@/constants/roles';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireModule('documents');
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [documents, patientsResult] = await Promise.all([
    listDocuments(orgId, { page }),
    listConnectedPatients(orgId, { page: 1, pageSize: 200 }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const patientOptions = patientsResult.rows.map((p) => ({
    id: p.connection.patient_id,
    label: `${p.profile?.full_name ?? 'Unknown'} (${p.profile?.patient_id ?? '—'})`,
  }));

  return (
    <OrgDocumentsPanel
      description="Share files with connected patients. Open them here, or patients can open them in the CareMate app under Me → Documents."
      canWrite={canWrite}
      patients={patientOptions}
      documents={documents}
      hrefForPage={(p) => hrefWithPage('/app/documents', p)}
    />
  );
}
