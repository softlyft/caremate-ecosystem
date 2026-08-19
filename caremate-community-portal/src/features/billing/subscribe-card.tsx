'use client';

import { useState, useTransition } from 'react';
import { startPremiumCheckout } from '@/domains/billing/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SubscribeCard({ defaultCurrency }: { defaultCurrency: 'NGN' | 'USD' }) {
  const [planType, setPlanType] = useState<'personal' | 'family'>('personal');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>(defaultCurrency);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function subscribe() {
    setError(null);
    startTransition(async () => {
      const result = await startPremiumCheckout({
        planType,
        billingInterval,
        currency,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CareMate Premium</CardTitle>
        <CardDescription>
          Subscribe with Paystack (Naira) or Stripe (USD). The same account unlocks Premium in the
          CareMate app. Family plans need a household already set up in the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="plan-type">Plan</Label>
            <Select
              id="plan-type"
              value={planType}
              onChange={(event) => setPlanType(event.target.value as 'personal' | 'family')}
            >
              <option value="personal">Standard Premium</option>
              <option value="family">Family Premium</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="billing-interval">Billing</Label>
            <Select
              id="billing-interval"
              value={billingInterval}
              onChange={(event) => setBillingInterval(event.target.value as 'monthly' | 'yearly')}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select
              id="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as 'NGN' | 'USD')}
            >
              <option value="NGN">NGN · Paystack</option>
              <option value="USD">USD · Stripe</option>
            </Select>
          </div>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="button" loading={pending} onClick={() => subscribe()}>
          Continue to checkout
        </Button>
      </CardContent>
    </Card>
  );
}
