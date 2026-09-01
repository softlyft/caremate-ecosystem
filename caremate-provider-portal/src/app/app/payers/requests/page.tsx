import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listProviderPayerConnectionsByStatus } from '@/domains/payer-connections/repository';
import { getProviderOrgPlanUsage } from '@/domains/billing/repository';
import { parsePage } from '@/lib/pagination';
import { dualPageRequestsHref } from '@/lib/care-portal-nav';
import { RequestOrgConnectionForm } from '@/components/features/request-org-connection-form';
import {
  OrgOrgConnectionRequestsPanel,
  type OrgOrgConnectionRequestRow,
} from '@/components/features/org-org-connection-requests-panel';
import { canWriteOrg } from '@/constants/roles';
import { ProviderPayerConnectionsLiveRefresh } from '@/components/features/provider-payer-connections-live-refresh';

const BASE_PATH = '/app/payers/requests';

function mapInboundRow(
  r: Awaited<ReturnType<typeof listProviderPayerConnectionsByStatus>>['rows'][number],
): OrgOrgConnectionRequestRow {
  return {
    id: r.id,
    orgName: r.payer?.name ?? 'Unknown',
    claimEmail: r.payer?.email ?? '—',
    phone: r.payer?.phone ?? null,
    inboundNote: r.payer_note,
    outboundNote: null,
    created_at: r.created_at,
    status: r.status,
  };
}

function mapOutboundRow(
  r: Awaited<ReturnType<typeof listProviderPayerConnectionsByStatus>>['rows'][number],
): OrgOrgConnectionRequestRow {
  return {
    id: r.id,
    orgName: r.payer?.name ?? 'Unknown',
    claimEmail: r.payer?.email ?? '—',
    phone: r.payer?.phone ?? null,
    inboundNote: null,
    outboundNote: r.provider_note,
    created_at: r.created_at,
    status: r.status,
  };
}

export default async function PayerConnectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outboundPage?: string }>;
}) {
  await requireModule('payers');
  const session = await requireProviderSession();
  const usage = await getProviderOrgPlanUsage(session.activeOrganizationId);
  const { page: pageParam, outboundPage: outboundPageParam } = await searchParams;
  const page = parsePage(pageParam);
  const outboundPage = parsePage(outboundPageParam);

  const [inboundRaw, outboundRaw] = await Promise.all([
    listProviderPayerConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page,
      initiatedBy: 'payer',
    }),
    listProviderPayerConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page: outboundPage,
      initiatedBy: 'provider',
    }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);
  const { entitlements, approvedPayerConnectionCount } = usage;
  const canApprovePartners = approvedPayerConnectionCount < entitlements.payer_connection_cap;
  const canRequestPartners = canApprovePartners;

  const inbound = { ...inboundRaw, rows: inboundRaw.rows.map(mapInboundRow) };
  const outbound = { ...outboundRaw, rows: outboundRaw.rows.map(mapOutboundRow) };

  return (
    <>
      <ProviderPayerConnectionsLiveRefresh
        organizationId={session.activeOrganizationId}
        side="provider"
      />
      <OrgOrgConnectionRequestsPanel
      title="Payer connection requests"
      description="Request a connection with a verified payer organization, or approve payers who want to connect"
      entityLabel="Payer"
      canWrite={canWrite}
      requestForm={<RequestOrgConnectionForm />}
      requestFormDescription="Enter the payer's claim/verification contact email. Both organizations must be verified. The payer must approve in Care Portal."
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
      connectionSide="provider"
      showPhoneColumn
      emptyInboundMessage="No payer requests waiting for approval."
      emptyOutboundMessage="No outbound requests waiting on payers."
      awaitingOutboundLabel="Awaiting payer"
      planUsageRows={[
        {
          label: 'Approved payer connections',
          used: approvedPayerConnectionCount,
          limit: entitlements.payer_connection_cap,
        },
      ]}
      canApprovePartners={canApprovePartners}
      canRequestPartners={canRequestPartners}
      upgradeHref="/app/settings/billing"
    />
    </>
  );
}
