'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type PlanTier = 'basic' | 'pro' | 'enterprise';
type BillingInterval = 'monthly' | 'yearly';

export function OrgGrantForm({
  organizationIdLabel,
  onGrant,
  successMessage = 'Plan granted',
}: {
  organizationIdLabel: string;
  onGrant: (input: {
    organizationId: string;
    planTier: PlanTier;
    billingInterval: BillingInterval;
    periodMonths: number;
  }) => Promise<void>;
  successMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="max-w-lg rounded-lg border border-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await onGrant({
              organizationId: String(fd.get('organization_id') ?? ''),
              planTier: String(fd.get('plan_tier')) as PlanTier,
              billingInterval: String(fd.get('billing_interval')) as BillingInterval,
              periodMonths: Number(fd.get('period_months') || 12),
            });
            toast.success(successMessage);
            e.currentTarget.reset();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Grant failed');
          }
        });
      }}
    >
      <FormStack>
        <FormField label={organizationIdLabel} htmlFor="organization_id">
          <Input id="organization_id" name="organization_id" required disabled={pending} />
        </FormField>
        <FormField label="Plan" htmlFor="plan_tier">
          <Select id="plan_tier" name="plan_tier" defaultValue="basic" disabled={pending}>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </Select>
        </FormField>
        <FormField label="Interval" htmlFor="billing_interval">
          <Select id="billing_interval" name="billing_interval" defaultValue="yearly" disabled={pending}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </FormField>
        <FormField label="Period (months)" htmlFor="period_months">
          <Input
            id="period_months"
            name="period_months"
            type="number"
            min="1"
            defaultValue={12}
            disabled={pending}
          />
        </FormField>
        <FormActions className="justify-start">
          <Button type="submit" loading={pending} loadingLabel="Granting…">
            Grant plan
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
