import { requirePayerSession } from '@/lib/auth';
import { listPayerProviderConnectionsByStatus } from '@/domains/payer-connections/repository';
import { requestProviderConnectionByEmailAction } from '@/domains/payer-connections/actions';
import { parsePage } from '@/lib/pagination';
import { dualPageRequestsHref } from '@/lib/care-portal-nav';
import { RequestOrgConnectionForm } from '@/components/features/request-org-connection-form';
import {
  OrgOrgConnectionRequestsPanel,
  type OrgOrgConnectionRequestRow,
} from '@/components/features/org-org-connection-requests-panel';
import { canWriteOrg } from '@/constants/roles';
import { ProviderPayerConnectionsLiveRefresh } from '@/components/features/provider-payer-connections-live-refresh';

const BASE_PATH = '/payer/providers/requests';

function mapInboundRow(
  r: Awaited<ReturnType<typeof listPayerProviderConnectionsByStatus>>['rows'][number],
): OrgOrgConnectionRequestRow {
  return {
    id: r.id,
    orgName: r.provider?.name ?? 'Unknown',
    claimEmail: r.providerClaimEmail ?? '—',
    phone: null,
    inboundNote: r.provider_note,
    outboundNote: null,
    created_at: r.created_at,
    status: r.status,
  };
}

function mapOutboundRow(
  r: Awaited<ReturnType<typeof listPayerProviderConnectionsByStatus>>['rows'][number],
): OrgOrgConnectionRequestRow {
  return {
    id: r.id,
    orgName: r.provider?.name ?? 'Unknown',
    claimEmail: r.providerClaimEmail ?? '—',
    phone: null,
    inboundNote: null,
    outboundNote: r.payer_note,
    created_at: r.created_at,
    status: r.status,
  };
}

export default async function ProviderConnectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outboundPage?: string }>;
}) {
  const session = await requirePayerSession();
  const { page: pageParam, outboundPage: outboundPageParam } = await searchParams;
  const page = parsePage(pageParam);
  const outboundPage = parsePage(outboundPageParam);

  const [inboundRaw, outboundRaw] = await Promise.all([
    listPayerProviderConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page,
      initiatedBy: 'provider',
    }),
    listPayerProviderConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page: outboundPage,
      initiatedBy: 'payer',
    }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const inbound = { ...inboundRaw, rows: inboundRaw.rows.map(mapInboundRow) };
  const outbound = { ...outboundRaw, rows: outboundRaw.rows.map(mapOutboundRow) };

  return (
    <>
      <ProviderPayerConnectionsLiveRefresh
        organizationId={session.activeOrganizationId}
        side="payer"
      />
      <OrgOrgConnectionRequestsPanel
      title="Provider connection requests"
      description="Request a connection with a verified provider organization, or approve providers who want to connect"
      entityLabel="Provider"
      canWrite={canWrite}
      requestForm={
        <RequestOrgConnectionForm
          requestAction={requestProviderConnectionByEmailAction}
          emailLabel="Provider claim email"
          emailPlaceholder="admin@clinic.example"
          noteFieldName="payer_note"
          notePlaceholder="e.g. Network onboarding"
          successMessage="Connection request sent — waiting for the provider to approve"
        />
      }
      requestFormDescription="Enter the provider's claim/verification contact email. Both organizations must be verified. The provider must approve in Care Portal."
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
      connectionSide="payer"
      emptyInboundMessage="No provider requests waiting for approval."
      emptyOutboundMessage="No outbound requests waiting on providers."
      awaitingOutboundLabel="Awaiting provider"
    />
    </>
  );
}
