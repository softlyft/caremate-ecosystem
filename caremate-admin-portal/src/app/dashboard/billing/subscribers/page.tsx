import { listSubscriptionPrices, listSubscriptionsPage, type SubscriberRow } from '@/domains/billing/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { AddSubscriberPanel } from '@/features/billing/add-subscriber-panel';
import { BillingNav } from '@/features/billing/billing-nav';
import { SubscribersTable } from '@/features/billing/subscribers-table';
import { UpgradeToFamilyPanel } from '@/features/billing/upgrade-to-family-panel';
import { Select } from '@/components/ui/select';
import { redirect } from 'next/navigation';

function subscribersHref(opts: { status?: string; plan?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.plan) params.set('plan', opts.plan);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/billing/subscribers${qs ? `?${qs}` : ''}`;
}

export default async function BillingSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; plan?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  if (!canManageBilling(session?.role)) {
    redirect('/dashboard/billing');
  }

  const { status, plan, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let result: PaginatedResult<SubscriberRow> = emptyPage(page);
  let prices: Awaited<ReturnType<typeof listSubscriptionPrices>> = [];
  try {
    [result, prices] = await Promise.all([
      listSubscriptionsPage({
        status: status || undefined,
        planType: plan || undefined,
        page,
      }),
      listSubscriptionPrices(),
    ]);
  } catch {
    result = emptyPage(page);
    prices = [];
  }

  const hrefForPage = (nextPage: number) => subscribersHref({ status, plan, page: nextPage });

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Active Premium entitlements after a successful payment or admin grant."
      />

      <BillingNav current="subscribers" />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Subscribers</h2>
          <p className="mt-1 text-sm text-muted">
            Plan, period, and status for each entitlement. Gateway charges are under Transactions;
            admin grants have no payment.
          </p>
        </div>
      </div>

      <AddSubscriberPanel prices={prices} />
      <UpgradeToFamilyPanel prices={prices} />

      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="status" defaultValue={status ?? ''} className="w-44">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
          <option value="expired">Expired</option>
          <option value="incomplete">Incomplete</option>
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

      <SubscribersTable rows={result.rows} />
      <PaginationBar result={result} hrefForPage={hrefForPage} className="rounded-b-lg border border-t-0 border-border bg-white" />
    </div>
  );
}
