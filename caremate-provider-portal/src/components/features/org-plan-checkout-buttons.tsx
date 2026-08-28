'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextLink } from '@/components/ui/text-link';
import { startProviderOrgCheckoutAction } from '@/domains/billing/actions';

export type StartOrgCheckoutAction = typeof startProviderOrgCheckoutAction;

export function OrgPlanCheckoutButtons({
  websitePricingUrl,
  checkoutAction = startProviderOrgCheckoutAction,
}: {
  websitePricingUrl: string;
  checkoutAction?: StartOrgCheckoutAction;
}) {
  const [pending, startTransition] = useTransition();

  function checkout(planTier: 'basic' | 'pro', billingInterval: 'monthly' | 'yearly') {
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => checkout('basic', 'monthly')}
        >
          Basic monthly
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => checkout('basic', 'yearly')}
        >
          Basic yearly
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => checkout('pro', 'monthly')}
        >
          Pro monthly
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => checkout('pro', 'yearly')}
        >
          Pro yearly
        </Button>
      </div>
      <p className="text-xs text-muted">
        Paystack checkout (NGN). Compare plans on the{' '}
        <TextLink href={websitePricingUrl} external>
          marketing site
        </TextLink>
        . Enterprise: contact SoftLyft.
      </p>
    </div>
  );
}
