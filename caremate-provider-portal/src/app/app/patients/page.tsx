import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listConnectedPatients } from '@/domains/patients/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import {
  ConnectedPatientsPanel,
  type ConnectedPatientListRow,
} from '@/components/features/connected-patients-panel';
import { providerPatientConnectionHandlers } from '@/lib/connection-action-handlers';
import { canWriteOrg } from '@/constants/roles';

function mapRow(
  row: Awaited<ReturnType<typeof listConnectedPatients>>['rows'][number],
): ConnectedPatientListRow {
  return {
    connectionId: row.connection.id,
    patientUserId: row.connection.patient_id,
    profile: row.profile
      ? {
          full_name: row.profile.full_name,
          patient_id: row.profile.patient_id,
          phone: row.profile.phone,
        }
      : null,
    status: row.connection.status,
    approved_at: row.connection.approved_at,
    isStaff: Boolean(row.membership),
    lastActivityAt: row.lastActivityAt,
  };
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireModule('patients');
  const session = await requireProviderSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const canWrite = canWriteOrg(session.activeRole);
  const resultRaw = await listConnectedPatients(session.activeOrganizationId, {
    search: q,
    page,
  });
  const result = { ...resultRaw, rows: resultRaw.rows.map(mapRow) };

  return (
    <ConnectedPatientsPanel
      detailPathPrefix="/app/patients"
      canWrite={canWrite}
      query={q ?? ''}
      result={result}
      rows={result.rows}
      hrefForPage={(p) => hrefWithPage('/app/patients', p, { q })}
      connectionHandlers={providerPatientConnectionHandlers}
      showStaffColumn
      showLastActivityColumn
    />
  );
}
