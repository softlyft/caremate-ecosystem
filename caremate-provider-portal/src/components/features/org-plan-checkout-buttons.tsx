'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextLink } from '@/components/ui/text-link';
import { startProviderOrgCheckoutAction } from '@/domains/billing/actions';

export type StartOrgCheckoutAction = typeof startProviderOrgCheckoutAction;

type PlanTier = 'basic' | 'pro';
type BillingInterval = 'monthly' | 'yearly';

const TIER_RANK: Record<PlanTier, number> = { basic: 1, pro: 2 };
const INTERVAL_RANK: Record<BillingInterval, number> = { monthly: 1, yearly: 2 };

function planRank(tier: PlanTier, interval: BillingInterval): number {
  return TIER_RANK[tier] * 10 + INTERVAL_RANK[interval];
}

function isAllowedCheckout(params: {
  currentTier: string | null | undefined;
  currentInterval: string | null | undefined;
  nextTier: PlanTier;
  nextInterval: BillingInterval;
}): boolean {
  const { currentTier, currentInterval, nextTier, nextInterval } = params;
  if (currentTier !== 'basic' && currentTier !== 'pro') {
    return true;
  }
  if (currentInterval !== 'monthly' && currentInterval !== 'yearly') {
    return true;
  }
  return planRank(nextTier, nextInterval) >= planRank(currentTier, currentInterval);
}

export function OrgPlanCheckoutButtons({
  websitePricingUrl,
  checkoutAction = startProviderOrgCheckoutAction,
  currentPlanTier,
  currentBillingInterval,
}: {
  websitePricingUrl: string;
  checkoutAction?: StartOrgCheckoutAction;
  currentPlanTier?: string | null;
  currentBillingInterval?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function checkout(planTier: PlanTier, billingInterval: BillingInterval) {
    if (
      !isAllowedCheckout({
        currentTier: currentPlanTier,
        currentInterval: currentBillingInterval,
        nextTier: planTier,
        nextInterval: billingInterval,
      })
    ) {
      toast.error('Downgrades are not supported. Choose the same plan to renew or a higher plan.');
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('plan_tier', planTier);
        fd.set('billing_interval', billingInterval);
        const result = await checkoutAction(fd);
        window.location.href = result.url;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Checkout failed');
      }
    });
  }

  const options: { tier: PlanTier; interval: BillingInterval; label: string; secondary?: boolean }[] =
    [
      { tier: 'basic', interval: 'monthly', label: 'Basic monthly' },
      { tier: 'basic', interval: 'yearly', label: 'Basic yearly (10% off)', secondary: true },
      { tier: 'pro', interval: 'monthly', label: 'Pro monthly' },
      { tier: 'pro', interval: 'yearly', label: 'Pro yearly (10% off)', secondary: true },
    ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const allowed = isAllowedCheckout({
            currentTier: currentPlanTier,
            currentInterval: currentBillingInterval,
            nextTier: option.tier,
            nextInterval: option.interval,
          });
          return (
            <Button
              key={`${option.tier}-${option.interval}`}
              type="button"
              size="sm"
              variant={option.secondary ? 'secondary' : 'default'}
              disabled={pending || !allowed}
              title={
                allowed
                  ? undefined
                  : 'Downgrades are not supported — renew the same plan or upgrade'
              }
              onClick={() => checkout(option.tier, option.interval)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Paystack checkout (NGN). Plans are upgrade-only (or same-plan renewal). Yearly is 10% off vs
        12× monthly. Compare plans on the{' '}
        <TextLink href={websitePricingUrl} external>
          marketing site
        </TextLink>
        . Enterprise: contact SoftLyft.
      </p>
    </div>
  );
}
