import { listSubscriptions } from '@/domains/billing/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
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
        title="Subscribers"
        description="Premium subscriptions from Paystack and Stripe webhooks."
        actionHref="/dashboard/billing"
        actionLabel="Edit prices"
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="status" defaultValue={status ?? ''} className="w-44">
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="incomplete">incomplete</option>
          <option value="past_due">past_due</option>
          <option value="canceled">canceled</option>
          <option value="expired">expired</option>
          <option value="trialing">trialing</option>
        </Select>
        <Select name="plan" defaultValue={plan ?? ''} className="w-44">
          <option value="">All plans</option>
          <option value="personal">personal</option>
          <option value="family">family</option>
        </Select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <SubscribersTable rows={rows} />
    </div>
  );
}
