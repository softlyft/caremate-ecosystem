import { requirePayerSession } from '@/lib/auth';
import { listPatientPayerConnectionsByStatus } from '@/domains/patient-payer-connections/repository';
import { getPayerOrgPlanUsage } from '@/domains/payer-billing/repository';
import { requestPatientConnectionByCaremateIdAction } from '@/domains/patient-payer-connections/actions';
import { parsePage } from '@/lib/pagination';
import { dualPageRequestsHref } from '@/lib/care-portal-nav';
import { RequestPatientConnectionForm } from '@/components/features/request-patient-connection-form';
import {
  OrgPatientConnectionRequestsPanel,
  type PatientConnectionRequestRow,
} from '@/components/features/org-patient-connection-requests-panel';
import { payerPatientConnectionHandlers } from '@/lib/connection-action-handlers';
import { canWriteOrg } from '@/constants/roles';

const BASE_PATH = '/payer/patients/requests';

function mapRow(
  r: Awaited<ReturnType<typeof listPatientPayerConnectionsByStatus>>['rows'][number],
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

export default async function PatientConnectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outboundPage?: string }>;
}) {
  const session = await requirePayerSession();
  const usage = await getPayerOrgPlanUsage(session.activeOrganizationId);
  const { page: pageParam, outboundPage: outboundPageParam } = await searchParams;
  const page = parsePage(pageParam);
  const outboundPage = parsePage(outboundPageParam);

  const [inboundRaw, outboundRaw] = await Promise.all([
    listPatientPayerConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page,
      initiatedBy: 'patient',
    }),
    listPatientPayerConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page: outboundPage,
      initiatedBy: 'payer',
    }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);
  const { entitlements, approvedPatientCount } = usage;
  const canApprovePatients = approvedPatientCount < entitlements.patient_connection_cap;
  const canRequestPatients = canApprovePatients;

  const inbound = { ...inboundRaw, rows: inboundRaw.rows.map((r) => mapRow(r, null)) };
  const outbound = {
    ...outboundRaw,
    rows: outboundRaw.rows.map((r) => mapRow(r, r.payer_note)),
  };

  return (
    <OrgPatientConnectionRequestsPanel
      title="Patient connection requests"
      description="Request a connection with a CareMate patient, or approve patients who want to connect"
      canWrite={canWrite}
      requestForm={
        <RequestPatientConnectionForm
          requestAction={requestPatientConnectionByCaremateIdAction}
          noteFieldName="payer_note"
          notePlaceholder="e.g. Member onboarding"
          errorMapper="payer-patient"
        />
      }
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
      handlers={payerPatientConnectionHandlers}
      errorMapper="payer-patient"
      planUsageRows={[
        {
          label: 'Approved patients',
          used: approvedPatientCount,
          limit: entitlements.patient_connection_cap,
        },
      ]}
      canApprovePatients={canApprovePatients}
      canRequestPatients={canRequestPatients}
      upgradeHref="/payer/settings/billing"
    />
  );
}
