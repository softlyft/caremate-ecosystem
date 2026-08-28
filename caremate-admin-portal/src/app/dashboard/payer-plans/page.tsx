import { listPayerOrgPlanPrices } from '@/domains/payer-plans/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { PayerPlansNav } from '@/features/payer-plans/payer-plans-nav';
import { PayerPlanPriceEditor } from '@/features/payer-plans/payer-plan-price-editor';

export default async function PayerPlansPage() {
  const session = await getPortalSession();
  const canEdit = canManageBilling(session?.role);

  let prices: Awaited<ReturnType<typeof listPayerOrgPlanPrices>> = [];
  let loadError: string | null = null;
  try {
    prices = await listPayerOrgPlanPrices();
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load prices';
    prices = [];
  }

  return (
    <div>
      <PageHeader
        title="Payer plans"
        description="Support Team catalog for payer orgs (Basic / Pro · monthly / yearly · Paystack NGN). Separate from provider Private Care Team and patient Premium."
      />

      <PayerPlansNav current="prices" />

      {!canEdit ? (
        <p className="mb-4 rounded-md border border-border bg-white p-3 text-sm text-muted">
          View only — admins can change amounts and limits.
        </p>
      ) : null}

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load prices: {loadError}
        </p>
      ) : null}

      <PayerPlanPriceEditor prices={prices} canEdit={Boolean(canEdit)} />
    </div>
  );
}
