import { requirePayerSession } from '@/lib/auth';
import { listPayerDocuments } from '@/domains/payer-documents/repository';
import { listPatientPayerConnectionsByStatus } from '@/domains/patient-payer-connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { OrgDocumentsPanel } from '@/components/features/org-documents-panel';
import {
  openPayerDocumentAction,
  uploadPayerDocumentAction,
} from '@/domains/payer-documents/actions';
import { canWriteOrg } from '@/constants/roles';

export default async function PayerDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePayerSession();
  const orgId = session.activeOrganizationId;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [documents, patientsResult] = await Promise.all([
    listPayerDocuments(orgId, { page }),
    listPatientPayerConnectionsByStatus(orgId, 'approved', { page: 1, pageSize: 200 }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const patientOptions = patientsResult.rows.map((p) => ({
    id: p.patient_id,
    label: `${p.profile?.full_name ?? 'Unknown'} (${p.profile?.patient_id ?? '—'})`,
  }));

  return (
    <OrgDocumentsPanel
      description="Share files with connected patients. Patients can open them in the CareMate app under Me → Documents."
      canWrite={canWrite}
      patients={patientOptions}
      documents={documents}
      hrefForPage={(p) => hrefWithPage('/payer/documents', p)}
      uploadAction={uploadPayerDocumentAction}
      openAction={openPayerDocumentAction}
      uploadDescription="Stored in Supabase Storage (payer-documents)"
    />
  );
}
