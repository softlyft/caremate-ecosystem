import type { EmergencyAccessLogRow } from '@/domains/emergency-access/repository';
import {
  formatAccessBasis,
  summarizeEmergencySnapshot,
} from '@/domains/emergency-access/repository';
import { Badge } from '@/components/ui/badge';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function EmergencyAccessLogsTable({ rows }: { rows: EmergencyAccessLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">
        No emergency QR access events match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Viewer (practitioner)</th>
            <th className="px-4 py-3 font-medium">Access basis</th>
            <th className="px-4 py-3 font-medium">Patient viewed</th>
            <th className="px-4 py-3 font-medium">Disclosed details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {formatDate(row.viewed_at)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">
                  {row.viewer_full_name?.trim() || 'Unknown'}
                </div>
                <div className="text-xs text-muted">{row.viewer_email ?? '—'}</div>
                {row.viewer_caremate_id ? (
                  <code className="text-xs text-muted">ID {row.viewer_caremate_id}</code>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{formatAccessBasis(row.viewer_access_basis)}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">
                  {row.patient_full_name?.trim() || 'Unknown'}
                </div>
                <div className="text-xs text-muted">{row.patient_email ?? '—'}</div>
                {row.patient_caremate_id ? (
                  <code className="text-xs text-muted">ID {row.patient_caremate_id}</code>
                ) : null}
              </td>
              <td className="max-w-md px-4 py-3 text-xs text-muted">
                {summarizeEmergencySnapshot(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
