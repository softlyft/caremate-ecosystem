'use client';

import { useMemo, useTransition } from 'react';
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

const PLAN_LABEL: Record<string, string> = {
  personal: 'Premium Personal',
  family: 'Premium Family',
};

const INTERVAL_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

type CurrencyGroup = {
  currency: string;
  provider: string;
  providerLabel: string;
  prices: SubscriptionPrice[];
};

function groupByCurrency(prices: SubscriptionPrice[]): CurrencyGroup[] {
  const order = ['NGN', 'USD'];
  const map = new Map<string, SubscriptionPrice[]>();
  for (const price of prices) {
    const list = map.get(price.currency) ?? [];
    list.push(price);
    map.set(price.currency, list);
  }

  const groups: CurrencyGroup[] = [];
  for (const currency of order) {
    const list = map.get(currency);
    if (!list?.length) continue;
    list.sort((a, b) => {
      const plan = a.plan_type.localeCompare(b.plan_type);
      if (plan !== 0) return plan;
      return a.billing_interval.localeCompare(b.billing_interval);
    });
    const provider = list[0].provider;
    groups.push({
      currency,
      provider,
      providerLabel: provider === 'paystack' ? 'Paystack' : 'Stripe',
      prices: list,
    });
  }

  for (const [currency, list] of map) {
    if (order.includes(currency)) continue;
    list.sort((a, b) => a.plan_type.localeCompare(b.plan_type));
    groups.push({
      currency,
      provider: list[0].provider,
      providerLabel: list[0].provider,
      prices: list,
    });
  }

  return groups;
}

function PriceRow({
  price,
  canEdit,
  pending,
  onSave,
}: {
  price: SubscriptionPrice;
  canEdit: boolean;
  pending: boolean;
  onSave: (form: FormData) => void;
}) {
  const amountLabel =
    price.currency === 'NGN' ? 'Amount (₦)' : price.currency === 'USD' ? 'Amount ($)' : 'Amount';

  return (
    <form
      className="grid gap-3 border-t border-border px-4 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canEdit) return;
        onSave(new FormData(e.currentTarget));
      }}
    >
      <div className="min-w-0 sm:self-center">
        <p className="text-sm font-medium text-foreground">
          {PLAN_LABEL[price.plan_type] ?? price.plan_type}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {INTERVAL_LABEL[price.billing_interval] ?? price.billing_interval}
          <span className="mx-1.5 text-border">·</span>
          {formatDisplayAmount(price.amount_minor, price.currency)}
          {!price.is_active ? (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span className="text-orange-700">Inactive</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${price.id}-amount`}>{amountLabel}</Label>
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

      <div className="space-y-1">
        {price.provider === 'stripe' ? (
          <>
            <Label htmlFor={`${price.id}-stripe`}>Stripe price ID</Label>
            <Input
              id={`${price.id}-stripe`}
              name="stripe_price_id"
              defaultValue={price.stripe_price_id ?? ''}
              disabled={!canEdit || pending}
              placeholder="Optional · price_…"
            />
          </>
        ) : (
          <>
            <Label htmlFor={`${price.id}-paystack`}>Paystack plan code</Label>
            <Input
              id={`${price.id}-paystack`}
              name="paystack_plan_code"
              defaultValue={price.paystack_plan_code ?? ''}
              disabled={!canEdit || pending}
              placeholder="Optional · PLN_…"
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={price.is_active}
            disabled={!canEdit || pending}
          />
          Active
        </label>
        {canEdit ? (
          <Button type="submit" disabled={pending} size="sm">
            {pending ? 'Saving…' : 'Save'}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function PriceEditor({ prices, canEdit }: { prices: SubscriptionPrice[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const groups = useMemo(() => groupByCurrency(prices), [prices]);

  if (prices.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">
        No prices found. Apply the billing migration (`npm run supabase:db:push`) then refresh.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <section
          key={group.currency}
          className="overflow-hidden rounded-lg border border-border bg-white"
        >
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              {group.currency === 'NGN'
                ? 'Nigeria'
                : group.currency === 'USD'
                  ? 'International'
                  : group.currency}
            </h2>
            <Badge variant="secondary">{group.currency}</Badge>
            <Badge>{group.providerLabel}</Badge>
            <p className="w-full text-xs text-muted sm:ml-auto sm:w-auto">
              {group.currency === 'NGN'
                ? 'Checkout uses Paystack for NGN prices.'
                : 'Checkout uses Stripe for USD prices.'}
            </p>
          </header>

          <div>
            {group.prices.map((price) => (
              <PriceRow
                key={price.id}
                price={price}
                canEdit={canEdit}
                pending={pending}
                onSave={(form) => {
                  const amountMajor = Number(form.get('amount_major'));
                  start(async () => {
                    try {
                      await updateSubscriptionPrice({
                        id: price.id,
                        amount_minor: Math.round(amountMajor * 100),
                        is_active: form.get('is_active') === 'on',
                        stripe_price_id: String(form.get('stripe_price_id') || '') || null,
                        paystack_plan_code:
                          String(form.get('paystack_plan_code') || '') || null,
                      });
                      toast.success('Price updated');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Update failed');
                    }
                  });
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
