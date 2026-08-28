'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';

import { createAdminSubscription } from '@/domains/billing/actions';
import type { SubscriptionPrice } from '@/types/database';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { subscriptionPriceOptionLabel } from '@/features/billing/billing-display';

export function AddSubscriberPanel({ prices }: { prices: SubscriptionPrice[] }) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [priceId, setPriceId] = useState(prices[0]?.id ?? '');
  const [pending, startTransition] = useTransition();

  const activePrices = prices.filter((p) => p.is_active);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await createAdminSubscription({ patientId, priceId });
        toast.success('Subscription activated (admin)');
        setPatientId('');
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not activate subscription');
      }
    });
  }

  return (
    <div className="mb-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setOpen((value) => !value)}
          variant={open ? 'secondary' : 'default'}
        >
          {open ? 'Cancel' : 'Add a subscriber'}
        </Button>
      </div>

      {open ? (
        <form
          onSubmit={onSubmit}
          className="mt-4 rounded-lg border border-border bg-white p-4 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-foreground">Admin-activated Premium</h3>
          <p className="mt-1 text-sm text-muted">
            Grants an active entitlement with no payment. Blocked if the user already has an
            active or trialing subscription. Mobile treats this like any other subscription.
            Provider will show as <strong>Admin activated</strong>.
          </p>

          <FormStack className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Patient ID"
                htmlFor="patient-id"
                hint="12-digit CareMate Patient ID from the member's profile."
              >
                <Input
                  id="patient-id"
                  name="patientId"
                  placeholder="XXXX XXXX XXXX"
                  inputMode="numeric"
                  autoComplete="off"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Plan" htmlFor="plan-price">
                <Select
                  id="plan-price"
                  name="priceId"
                  value={priceId}
                  onChange={(e) => setPriceId(e.target.value)}
                  required
                >
                  {activePrices.length === 0 ? (
                    <option value="">No active prices</option>
                  ) : (
                    activePrices.map((price) => (
                      <option key={price.id} value={price.id}>
                        {subscriptionPriceOptionLabel(price)}
                      </option>
                    ))
                  )}
                </Select>
              </FormField>
            </div>

            <FormActions>
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
                disabled={activePrices.length === 0}
                loading={pending}
                loadingLabel="Activating…"
              >
                Create subscription
              </Button>
            </FormActions>
          </FormStack>
        </form>
      ) : null}
    </div>
  );
}
