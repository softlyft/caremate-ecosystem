'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateSubscriptionPrice } from '@/domains/billing/actions';
import type { SubscriptionPrice } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function formatDisplayAmount(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major} ${currency}`;
  }
}

export function PriceEditor({ prices, canEdit }: { prices: SubscriptionPrice[]; canEdit: boolean }) {
  const [pending, start] = useTransition();

  if (prices.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">
        No prices found. Apply the billing migration (`npm run supabase:db:push`) then refresh.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {prices.map((price) => (
        <form
          key={price.id}
          className="rounded-lg border border-border bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canEdit) return;
            const form = new FormData(e.currentTarget);
            const amountMajor = Number(form.get('amount_major'));
            const isActive = form.get('is_active') === 'on';
            start(async () => {
              try {
                await updateSubscriptionPrice({
                  id: price.id,
                  amount_minor: Math.round(amountMajor * 100),
                  is_active: isActive,
                  stripe_price_id: String(form.get('stripe_price_id') || '') || null,
                  paystack_plan_code: String(form.get('paystack_plan_code') || '') || null,
                });
                toast.success('Price updated');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Update failed');
              }
            });
          }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold capitalize text-foreground">
              {price.plan_type} · {price.billing_interval}
            </p>
            <Badge>{price.currency}</Badge>
            <Badge className="bg-primary-light text-primary-dark">{price.provider}</Badge>
            <span className="text-xs text-muted">
              Current: {formatDisplayAmount(price.amount_minor, price.currency)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor={`${price.id}-amount`}>Amount (major units)</Label>
              <Input
                id={`${price.id}-amount`}
                name="amount_major"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(price.amount_minor / 100).toFixed(2)}
                disabled={!canEdit || pending}
                required
              />
            </div>
            {price.provider === 'stripe' ? (
              <div className="space-y-1">
                <Label htmlFor={`${price.id}-stripe`}>Stripe price ID (optional)</Label>
                <Input
                  id={`${price.id}-stripe`}
                  name="stripe_price_id"
                  defaultValue={price.stripe_price_id ?? ''}
                  disabled={!canEdit || pending}
                  placeholder="price_…"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor={`${price.id}-paystack`}>Paystack plan code (optional)</Label>
                <Input
                  id={`${price.id}-paystack`}
                  name="paystack_plan_code"
                  defaultValue={price.paystack_plan_code ?? ''}
                  disabled={!canEdit || pending}
                  placeholder="PLN_…"
                />
              </div>
            )}
            <div className="flex items-end gap-2 pb-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={price.is_active}
                  disabled={!canEdit || pending}
                />
                Active
              </label>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!canEdit || pending} className="w-full sm:w-auto">
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      ))}
    </div>
  );
}
