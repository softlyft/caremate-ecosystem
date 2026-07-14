import Link from 'next/link';
import { listSubscriptionPrices } from '@/domains/billing/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { PriceEditor } from '@/features/billing/price-editor';
import { Button } from '@/components/ui/button';

export default async function BillingPage() {
  const session = await getPortalSession();
  const canEdit = canManageBilling(session?.role);

  let prices: Awaited<ReturnType<typeof listSubscriptionPrices>> = [];
  try {
    prices = await listSubscriptionPrices();
  } catch {
    prices = [];
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Configure Premium Personal and Family prices (monthly/yearly · NGN/USD)."
      >
        <Link href="/dashboard/billing/subscribers">
          <Button type="button" variant="outline">
            Subscribers
          </Button>
        </Link>
      </PageHeader>

      {!canEdit ? (
        <p className="mb-4 rounded-md border border-border bg-white p-3 text-sm text-muted">
          Only admins can edit prices. You can still view the current catalog.
        </p>
      ) : null}

      <PriceEditor prices={prices} canEdit={Boolean(canEdit)} />
    </div>
  );
}
