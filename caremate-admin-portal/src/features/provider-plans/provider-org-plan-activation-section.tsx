import { getProviderOrgPlanActivationContext } from '@/domains/provider-plans/repository';
import type { OrgPlanActivationLookup } from '@/features/plans/org-plan-activation-types';
import { ProviderOrgGrantForm } from '@/features/provider-plans/provider-org-grant-form';

function toLookup(
  ctx: Awaited<ReturnType<typeof getProviderOrgPlanActivationContext>>,
): OrgPlanActivationLookup {
  return {
    found: ctx.found,
    organizationId: ctx.organizationId,
    organizationName: ctx.organizationName,
    claimed: ctx.claimed,
    activePlanTier: ctx.activeSubscription?.plan_tier ?? null,
    activePlanProvider: ctx.activeSubscription?.provider ?? null,
    activePeriodEnd: ctx.activeSubscription?.current_period_end ?? null,
  };
}

export async function ProviderOrgPlanActivationSection({
  organizationId,
}: {
  organizationId: string;
}) {
  const ctx = await getProviderOrgPlanActivationContext(organizationId);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Activate Basic, Pro, or Enterprise when the org pays outside Paystack. Claim must be
        complete first.
      </p>
      <ProviderOrgGrantForm organizationId={organizationId} initialLookup={toLookup(ctx)} />
    </div>
  );
}
