import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listConnectionsByStatus } from '@/domains/connections/repository';
import { getProviderOrgPlanUsage } from '@/domains/billing/repository';
import { parsePage } from '@/lib/pagination';
import { dualPageRequestsHref } from '@/lib/care-portal-nav';
import { RequestPatientConnectionForm } from '@/components/features/request-patient-connection-form';
import {
  OrgPatientConnectionRequestsPanel,
  type PatientConnectionRequestRow,
} from '@/components/features/org-patient-connection-requests-panel';
import { providerPatientConnectionHandlers } from '@/lib/connection-action-handlers';
import { canWriteOrg } from '@/constants/roles';

export const dynamic = 'force-dynamic';

const BASE_PATH = '/app/patients/requests';

function mapRow(
  r: Awaited<ReturnType<typeof listConnectionsByStatus>>['rows'][number],
  outboundNote: string | null,
): PatientConnectionRequestRow {
  return {
    id: r.id,
    profile: r.profile,
    patient_note: r.patient_note,
    outbound_note: outboundNote,
    created_at: r.created_at,
    status: r.status,
  };
}

export default async function ConnectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outboundPage?: string }>;
}) {
  await requireModule('patients');
  const session = await requireProviderSession();
  const usage = await getProviderOrgPlanUsage(session.activeOrganizationId);
  const { page: pageParam, outboundPage: outboundPageParam } = await searchParams;
  const page = parsePage(pageParam);
  const outboundPage = parsePage(outboundPageParam);

  const [inboundRaw, outboundRaw] = await Promise.all([
    listConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page,
      initiatedBy: 'patient',
    }),
    listConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page: outboundPage,
      initiatedBy: 'provider',
    }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);
  const { entitlements, approvedPatientCount } = usage;
  const canApprovePatients = approvedPatientCount < entitlements.patient_connection_cap;
  const canRequestPatients = canApprovePatients;

  const inbound = { ...inboundRaw, rows: inboundRaw.rows.map((r) => mapRow(r, null)) };
  const outbound = {
    ...outboundRaw,
    rows: outboundRaw.rows.map((r) => mapRow(r, r.provider_note)),
  };

  return (
    <OrgPatientConnectionRequestsPanel
      title="Connection requests"
      description="Request a connection with a CareMate patient, or approve patients who want to connect"
      canWrite={canWrite}
      requestForm={<RequestPatientConnectionForm />}
      inbound={inbound}
      outbound={outbound}
      hrefForInboundPage={(p) =>
        dualPageRequestsHref(BASE_PATH, {
          page: p,
          outboundPage: outboundPage > 1 ? outboundPage : undefined,
        })
      }
      hrefForOutboundPage={(p) =>
        dualPageRequestsHref(BASE_PATH, {
          page: page > 1 ? page : undefined,
          outboundPage: p,
        })
      }
      handlers={providerPatientConnectionHandlers}
      planUsageRows={[
        {
          label: 'Approved patients',
          used: approvedPatientCount,
          limit: entitlements.patient_connection_cap,
        },
      ]}
      canApprovePatients={canApprovePatients}
      canRequestPatients={canRequestPatients}
      upgradeHref="/app/settings/billing"
    />
  );
}
