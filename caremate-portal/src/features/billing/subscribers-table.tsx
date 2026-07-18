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

const PLAN_LABEL: Record<string, string> = {
  personal: 'Personal',
  family: 'Family',
};

const INTERVAL_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export function SubscribersTable({ rows }: { rows: SubscriberRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">
        No subscriptions match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Subscriber</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Period</th>
            <th className="px-4 py-3 font-medium">Payment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{row.email ?? 'Unknown'}</div>
                {row.household_id ? (
                  <div className="text-xs text-muted">Family household</div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <div className="text-foreground">
                  {PLAN_LABEL[row.plan_type] ?? row.plan_type}
                  <span className="text-muted">
                    {' '}
                    · {INTERVAL_LABEL[row.billing_interval] ?? row.billing_interval}
                  </span>
                </div>
                <div className="text-xs text-muted">{row.currency}</div>
              </td>
              <td className="px-4 py-3">
                {row.provider === 'admin' ? (
                  <Badge variant="warning">Admin activated</Badge>
                ) : (
                  <Badge className="capitalize">{row.provider}</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={row.status === 'active' ? 'success' : 'secondary'}
                  className="capitalize"
                >
                  {row.status.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted">
                <div>{formatDate(row.current_period_start)}</div>
                <div className="text-xs">→ {formatDate(row.current_period_end)}</div>
              </td>
              <td className="px-4 py-3">
                {row.provider === 'admin' ? (
                  <span className="text-xs text-muted">No payment</span>
                ) : row.payment_id ? (
                  <code className="break-all text-xs text-muted">{row.payment_id.slice(0, 8)}…</code>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
