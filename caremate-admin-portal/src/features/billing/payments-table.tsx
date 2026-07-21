import type { PaymentRow } from '@/domains/billing/repository';
import { Badge } from '@/components/ui/badge';

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatAmount(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major} ${currency}`;
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

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
  if (status === 'succeeded') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed' || status === 'abandoned') return 'danger';
  return 'secondary';
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">
        No transactions match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Paid</th>
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
                {row.subscription_id ? (
                  <div className="text-xs text-muted">Linked subscription</div>
                ) : null}
              </td>
              <td className="px-4 py-3 font-medium text-foreground">
                {formatAmount(row.amount_minor, row.currency)}
              </td>
              <td className="px-4 py-3">
                <div className="text-foreground">
                  {PLAN_LABEL[row.plan_type] ?? row.plan_type}
                  <span className="text-muted">
                    {' '}
                    · {INTERVAL_LABEL[row.billing_interval] ?? row.billing_interval}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge className="capitalize">{row.provider}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(row.status)} className="capitalize">
                  {row.status}
                </Badge>
                {row.failure_reason ? (
                  <div className="mt-1 max-w-[14rem] truncate text-xs text-muted" title={row.failure_reason}>
                    {row.failure_reason}
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <code className="break-all text-xs text-muted">{row.provider_reference}</code>
              </td>
              <td className="px-4 py-3 text-muted">
                {formatDate(row.paid_at ?? (row.status === 'pending' ? row.created_at : null))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
