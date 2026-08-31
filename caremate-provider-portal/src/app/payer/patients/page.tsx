import { requirePayerSession } from '@/lib/auth';
import { listPatientPayerConnectionsByStatus } from '@/domains/patient-payer-connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import {
  ConnectedPatientsPanel,
  type ConnectedPatientListRow,
} from '@/components/features/connected-patients-panel';
import { payerPatientConnectionHandlers } from '@/lib/connection-action-handlers';
import { canWriteOrg } from '@/constants/roles';

function mapRow(
  r: Awaited<ReturnType<typeof listPatientPayerConnectionsByStatus>>['rows'][number],
): ConnectedPatientListRow {
  return {
    connectionId: r.id,
    patientUserId: r.patient_id,
    profile: r.profile,
    status: r.status,
    approved_at: r.approved_at,
    isStaff: false,
    lastActivityAt: null,
  };
}

export default async function ConnectedPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePayerSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const canWrite = canWriteOrg(session.activeRole);
  const resultRaw = await listPatientPayerConnectionsByStatus(
    session.activeOrganizationId,
    'approved',
    { page, search: q },
  );
  const result = { ...resultRaw, rows: resultRaw.rows.map(mapRow) };

  return (
    <ConnectedPatientsPanel
      detailPathPrefix="/payer/patients"
      canWrite={canWrite}
      query={q ?? ''}
      result={result}
      rows={result.rows}
      hrefForPage={(p) => hrefWithPage('/payer/patients', p, { q })}
      connectionHandlers={payerPatientConnectionHandlers}
      connectionErrorMapper="payer-patient"
    />
  );
}
