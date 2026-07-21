import type { AuditLogRow } from '@/domains/audit/repository';
import { auditOperationKind, formatAuditAction } from '@/lib/audit-catalog';
import { Badge } from '@/components/ui/badge';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function operationVariant(
  kind: ReturnType<typeof auditOperationKind>,
): 'success' | 'warning' | 'danger' | 'secondary' {
  if (kind === 'create') return 'success';
  if (kind === 'update') return 'warning';
  if (kind === 'delete') return 'danger';
  return 'secondary';
}

function payloadPreview(payload: AuditLogRow['payload']): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return '—';
  }
  const entries = Object.entries(payload as Record<string, unknown>).slice(0, 4);
  if (entries.length === 0) return '—';
  return entries
    .map(([key, value]) => {
      const text =
        typeof value === 'string'
          ? value
          : value === null || value === undefined
            ? 'null'
            : JSON.stringify(value);
      const clipped = text.length > 40 ? `${text.slice(0, 40)}…` : text;
      return `${key}: ${clipped}`;
    })
    .join(' · ');
}

export function AuditLogsTable({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">
        No audit events match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Actor</th>
            <th className="px-4 py-3 font-medium">Operation</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Entity</th>
            <th className="px-4 py-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const kind = auditOperationKind(row.action);
            return (
              <tr key={row.id} className="border-b border-border last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {row.actor_email ?? 'Unknown'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={operationVariant(kind)} className="capitalize">
                    {kind}
                  </Badge>
                </td>
                <td className="px-4 py-3 capitalize text-foreground">
                  {formatAuditAction(row.action)}
                </td>
                <td className="px-4 py-3">
                  <div className="text-foreground">{row.entity_type}</div>
                  {row.entity_id ? (
                    <code className="break-all text-xs text-muted">{row.entity_id}</code>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-muted">
                  {payloadPreview(row.payload)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
