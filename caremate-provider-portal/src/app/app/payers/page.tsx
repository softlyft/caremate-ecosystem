import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listProviderPayerConnectionsByStatus } from '@/domains/payer-connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import {
  ConnectedOrgsPanel,
  type ConnectedOrgRow,
} from '@/components/features/connected-orgs-panel';
import { canWriteOrg } from '@/constants/roles';
import { ProviderPayerConnectionsLiveRefresh } from '@/components/features/provider-payer-connections-live-refresh';

function mapRow(
  r: Awaited<ReturnType<typeof listProviderPayerConnectionsByStatus>>['rows'][number],
): ConnectedOrgRow {
  return {
    id: r.id,
    name: r.payer?.name ?? 'Unknown',
    claimEmail: r.payer?.email ?? '—',
    phone: r.payer?.phone ?? null,
    status: r.status,
    approved_at: r.approved_at,
  };
}

export default async function ConnectedPayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireModule('payers');
  const session = await requireProviderSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const canWrite = canWriteOrg(session.activeRole);
  const resultRaw = await listProviderPayerConnectionsByStatus(
    session.activeOrganizationId,
    'approved',
    { page },
  );
  const result = { ...resultRaw, rows: resultRaw.rows.map(mapRow) };

  const query = (q ?? '').trim().toLowerCase();
  const rows = query
    ? result.rows.filter((r) => {
        const name = r.name.toLowerCase();
        const email = r.claimEmail.toLowerCase();
        return name.includes(query) || email.includes(query);
      })
    : result.rows;

  return (
    <>
      <ProviderPayerConnectionsLiveRefresh
        organizationId={session.activeOrganizationId}
        side="provider"
      />
      <ConnectedOrgsPanel
      title="Connected payers"
      tableTitle="Payers"
      total={result.total}
      rows={rows}
      result={result}
      query={q ?? ''}
      hrefForPage={(p) => hrefWithPage('/app/payers', p, { q })}
      searchPlaceholder="Search name or claim email"
      canWrite={canWrite}
      connectionSide="provider"
      emptyMessage="No connected payers yet."
      entityNameHeader="Payer name"
      showPhoneColumn
    />
    </>
  );
}
