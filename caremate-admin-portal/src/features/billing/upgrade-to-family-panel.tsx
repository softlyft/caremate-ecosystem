'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';

import { adminUpgradeToFamily } from '@/domains/billing/actions';
import type { SubscriptionPrice } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const INTERVAL_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function formatAmount(amountMinor: number, currency: string) {
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

function priceOptionLabel(price: SubscriptionPrice) {
  return `Family · ${INTERVAL_LABEL[price.billing_interval] ?? price.billing_interval} · ${formatAmount(price.amount_minor, price.currency)}`;
}

export function UpgradeToFamilyPanel({ prices }: { prices: SubscriptionPrice[] }) {
  const [open, setOpen] = useState(false);
  const familyPrices = prices.filter((p) => p.is_active && p.plan_type === 'family');
  const [patientId, setPatientId] = useState('');
  const [priceId, setPriceId] = useState(familyPrices[0]?.id ?? '');
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await adminUpgradeToFamily({ patientId, priceId });
        toast.success('Upgraded to Family (admin)');
        setPatientId('');
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not upgrade to Family');
      }
    });
  }

  return (
    <div className="mb-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setOpen((value) => !value)}
          variant={open ? 'secondary' : 'outline'}
        >
          {open ? 'Cancel' : 'Upgrade to Family'}
        </Button>
      </div>

      {open ? (
        <form
          onSubmit={onSubmit}
          className="mt-4 rounded-lg border border-border bg-white p-4 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-foreground">
            Admin upgrade: Standard → Family
          </h3>
          <p className="mt-1 text-sm text-muted">
            Cancels the member&apos;s active Standard subscription and grants a new Family period
            starting today (no payment). Requires an existing household in the app.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="upgrade-patient-id">Patient ID</Label>
              <Input
                id="upgrade-patient-id"
                name="patientId"
                placeholder="XXXX XXXX XXXX"
                inputMode="numeric"
                autoComplete="off"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upgrade-plan-price">Family plan</Label>
              <Select
                id="upgrade-plan-price"
                name="priceId"
                value={priceId}
                onChange={(e) => setPriceId(e.target.value)}
                required
              >
                {familyPrices.length === 0 ? (
                  <option value="">No active Family prices</option>
                ) : (
                  familyPrices.map((price) => (
                    <option key={price.id} value={price.id}>
                      {priceOptionLabel(price)}
                    </option>
                  ))
                )}
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={familyPrices.length === 0}
              loading={pending}
              loadingLabel="Upgrading…"
            >
              Upgrade to Family
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
