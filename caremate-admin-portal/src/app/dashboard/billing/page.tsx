import { listSubscriptionPrices } from '@/domains/billing/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { BillingNav } from '@/features/billing/billing-nav';
import { PriceEditor } from '@/features/billing/price-editor';

export default async function BillingPage() {
  const session = await getPortalSession();
  const canEdit = canManageBilling(session?.role);

  let prices: Awaited<ReturnType<typeof listSubscriptionPrices>> = [];
  let loadError: string | null = null;
  try {
    prices = await listSubscriptionPrices();
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load prices';
    prices = [];
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Premium plan prices for CareMate checkout (Personal / Family · monthly / yearly)."
      />

      <BillingNav current="prices" />

      {!canEdit ? (
        <p className="mb-4 rounded-md border border-border bg-white p-3 text-sm text-muted">
          View only — admins can change amounts and provider IDs.
        </p>
      ) : null}

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load prices: {loadError}
        </p>
      ) : null}

      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Price catalog</h2>
        <p className="mt-1 text-sm text-muted">
          Edit the amount shown at checkout. Provider IDs are optional until you wire Stripe or
          Paystack catalog prices.
        </p>
      </div>

      <PriceEditor prices={prices} canEdit={Boolean(canEdit)} />
    </div>
  );
}
