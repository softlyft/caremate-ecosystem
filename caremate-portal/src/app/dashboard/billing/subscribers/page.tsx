import { listSubscriptions } from '@/domains/billing/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { BillingNav } from '@/features/billing/billing-nav';
import { SubscribersTable } from '@/features/billing/subscribers-table';
import { Select } from '@/components/ui/select';
import { redirect } from 'next/navigation';

export default async function BillingSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; plan?: string }>;
}) {
  const session = await getPortalSession();
  if (!canManageBilling(session?.role)) {
    redirect('/dashboard/billing');
  }

  const { status, plan } = await searchParams;
  let rows: Awaited<ReturnType<typeof listSubscriptions>> = [];
  try {
    rows = await listSubscriptions({
      status: status || undefined,
      planType: plan || undefined,
    });
  } catch {
    rows = [];
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Premium subscriptions recorded from Paystack and Stripe webhooks."
      />

      <BillingNav current="subscribers" />

      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Subscribers</h2>
        <p className="mt-1 text-sm text-muted">
          Filter by status or plan. Period end comes from the provider webhook.
        </p>
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="status" defaultValue={status ?? ''} className="w-44">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="incomplete">Incomplete</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
          <option value="expired">Expired</option>
          <option value="trialing">Trialing</option>
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

      <SubscribersTable rows={rows} />
    </div>
  );
}
