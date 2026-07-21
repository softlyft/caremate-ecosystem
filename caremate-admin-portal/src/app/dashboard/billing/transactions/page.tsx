import { listPayments } from '@/domains/billing/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { BillingNav } from '@/features/billing/billing-nav';
import { PaymentsTable } from '@/features/billing/payments-table';
import { Select } from '@/components/ui/select';
import { redirect } from 'next/navigation';

export default async function BillingTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; plan?: string }>;
}) {
  const session = await getPortalSession();
  if (!canManageBilling(session?.role)) {
    redirect('/dashboard/billing');
  }

  const { status, provider, plan } = await searchParams;
  let rows: Awaited<ReturnType<typeof listPayments>> = [];
  let loadError: string | null = null;
  try {
    rows = await listPayments({
      status: status || undefined,
      provider: provider || undefined,
      planType: plan || undefined,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load transactions';
    rows = [];
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Paystack and Stripe charges recorded in the payments ledger."
      />

      <BillingNav current="transactions" />

      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Transactions</h2>
        <p className="mt-1 text-sm text-muted">
          Money collected (or attempted) at checkout. A succeeded payment creates or renews a
          subscriber entitlement.
        </p>
      </div>

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load transactions: {loadError}
        </p>
      ) : null}

      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="status" defaultValue={status ?? ''} className="w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
        </Select>
        <Select name="provider" defaultValue={provider ?? ''} className="w-44">
          <option value="">All providers</option>
          <option value="paystack">Paystack</option>
          <option value="stripe">Stripe</option>
        </Select>
        <Select name="plan" defaultValue={plan ?? ''} className="w-44">
          <option value="">All plans</option>
          <option value="personal">Personal</option>
          <option value="family">Family</option>
        </Select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <PaymentsTable rows={rows} />
    </div>
  );
}
