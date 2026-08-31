import { requirePayerSession } from '@/lib/auth';
import { listPayerProviderConnectionsByStatus } from '@/domains/payer-connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import {
  ConnectedOrgsPanel,
  type ConnectedOrgRow,
} from '@/components/features/connected-orgs-panel';
import { canWriteOrg } from '@/constants/roles';

function mapRow(
  r: Awaited<ReturnType<typeof listPayerProviderConnectionsByStatus>>['rows'][number],
): ConnectedOrgRow {
  return {
    id: r.id,
    name: r.provider?.name ?? 'Unknown',
    claimEmail: r.providerClaimEmail ?? '—',
    phone: null,
    status: r.status,
    approved_at: r.approved_at,
  };
}

export default async function ConnectedProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePayerSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const canWrite = canWriteOrg(session.activeRole);
  const resultRaw = await listPayerProviderConnectionsByStatus(
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
    <ConnectedOrgsPanel
      title="Connected providers"
      tableTitle="Providers"
      total={result.total}
      rows={rows}
      result={result}
      query={q ?? ''}
      hrefForPage={(p) => hrefWithPage('/payer/providers', p, { q })}
      searchPlaceholder="Search name or claim email"
      canWrite={canWrite}
      connectionSide="payer"
      emptyMessage="No connected providers yet."
      entityNameHeader="Provider name"
    />
  );
}
