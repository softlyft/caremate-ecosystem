import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { canViewAuditLogs } from '@/constants/roles';
import {
  listAuditEventsPage,
  listDistinctAuditActions,
  listDistinctAuditEntityTypes,
  type AuditLogRow,
} from '@/domains/audit/repository';
import { AuditLogsTable } from '@/features/audit/audit-logs-table';
import { getPortalSession } from '@/lib/auth';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';

function auditHref(opts: {
  operation?: string;
  action?: string;
  entity?: string;
  actor?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (opts.operation) params.set('operation', opts.operation);
  if (opts.action) params.set('action', opts.action);
  if (opts.entity) params.set('entity', opts.entity);
  if (opts.actor?.trim()) params.set('actor', opts.actor.trim());
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/audit${qs ? `?${qs}` : ''}`;
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    operation?: string;
    action?: string;
    entity?: string;
    actor?: string;
    page?: string;
  }>;
}) {
  const session = await getPortalSession();
  if (!canViewAuditLogs(session?.role)) {
    redirect('/dashboard');
  }

  const { operation, action, entity, actor, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const op =
    operation === 'create' ||
    operation === 'update' ||
    operation === 'delete' ||
    operation === 'other'
      ? operation
      : undefined;

  let result: PaginatedResult<AuditLogRow> = emptyPage(page);
  let actions: string[] = [];
  let entities: string[] = [];
  let loadError: string | null = null;

  try {
    [result, actions, entities] = await Promise.all([
      listAuditEventsPage({
        operation: op,
        action: action || undefined,
        entityType: entity || undefined,
        actorEmail: actor || undefined,
        page,
      }),
      listDistinctAuditActions(),
      listDistinctAuditEntityTypes(),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load audit logs';
    result = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) =>
    auditHref({ operation, action, entity, actor, page: nextPage });

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="Create, update, and delete operations performed by portal staff."
      />

      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Activity</h2>
        <p className="mt-1 text-sm text-muted">
          Every catalog, ads, billing, and user mutation writes a row here after it succeeds.
        </p>
      </div>

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load audit logs: {loadError}
        </p>
      ) : null}

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <Select name="operation" defaultValue={operation ?? ''} className="w-40">
          <option value="">All operations</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="other">Other</option>
        </Select>
        <Select name="action" defaultValue={action ?? ''} className="w-56">
          <option value="">All actions</option>
          {actions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select name="entity" defaultValue={entity ?? ''} className="w-48">
          <option value="">All entities</option>
          {entities.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Input
          name="actor"
          defaultValue={actor ?? ''}
          placeholder="Actor email"
          className="w-52"
        />
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <AuditLogsTable rows={result.rows} />
      <PaginationBar result={result} hrefForPage={hrefForPage} className="rounded-b-lg border border-t-0 border-border bg-white" />
    </div>
  );
}
