import Link from 'next/link';
import type { SubscriberRow } from '@/domains/billing/repository';
import { Badge } from '@/components/ui/badge';

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function SubscribersTable({ rows }: { rows: SubscriberRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">
        No subscriptions yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Period end</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{row.email ?? 'Unknown'}</div>
                <div className="text-xs text-muted">{row.user_id}</div>
                {row.household_id ? (
                  <div className="text-xs text-muted">Household {row.household_id}</div>
                ) : null}
              </td>
              <td className="px-4 py-3 capitalize">
                {row.plan_type} · {row.billing_interval}
                <div className="text-xs text-muted">{row.currency}</div>
              </td>
              <td className="px-4 py-3">
                <Badge>{row.provider}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge className="capitalize">{row.status}</Badge>
              </td>
              <td className="px-4 py-3 text-muted">{formatDate(row.current_period_end)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border px-4 py-2 text-xs text-muted">
        Need price changes?{' '}
        <Link href="/dashboard/billing" className="text-primary-dark underline">
          Edit prices
        </Link>
      </div>
    </div>
  );
}
