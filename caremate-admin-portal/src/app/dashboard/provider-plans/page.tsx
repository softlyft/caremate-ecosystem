import { listProviderOrgPlanPrices } from '@/domains/provider-plans/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { ProviderPlansNav } from '@/features/provider-plans/provider-plans-nav';
import { ProviderPlanPriceEditor } from '@/features/provider-plans/provider-plan-price-editor';

export default async function ProviderPlansPage() {
  const session = await getPortalSession();
  const canEdit = canManageBilling(session?.role);

  let prices: Awaited<ReturnType<typeof listProviderOrgPlanPrices>> = [];
  let loadError: string | null = null;
  try {
    prices = await listProviderOrgPlanPrices();
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load prices';
    prices = [];
  }

  return (
    <div>
      <PageHeader
        title="Provider plans"
        description="Private Care Team catalog for Care Portal (Basic / Pro · monthly / yearly with 10% annual discount · Paystack NGN). Separate from patient Premium."
      />

      <ProviderPlansNav current="prices" />

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

      <ProviderPlanPriceEditor prices={prices} canEdit={Boolean(canEdit)} />
    </div>
  );
}
