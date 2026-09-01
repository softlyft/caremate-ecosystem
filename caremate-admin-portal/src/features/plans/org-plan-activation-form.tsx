'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import type { OrgPlanActivationLookup } from '@/features/plans/org-plan-activation-types';

type PlanTier = 'basic' | 'pro' | 'enterprise';
type BillingInterval = 'monthly' | 'yearly';

export function OrgPlanActivationForm({
  organizationIdLabel,
  initialOrganizationId = '',
  lockOrganizationId = false,
  initialLookup,
  onLookup,
  onActivate,
  successMessage = 'Plan activated',
}: {
  organizationIdLabel: string;
  initialOrganizationId?: string;
  lockOrganizationId?: boolean;
  initialLookup?: OrgPlanActivationLookup | null;
  onLookup: (organizationId: string) => Promise<OrgPlanActivationLookup>;
  onActivate: (input: {
    organizationId: string;
    planTier: PlanTier;
    billingInterval: BillingInterval;
    periodMonths: number;
  }) => Promise<void>;
  successMessage?: string;
}) {
  const [lookup, setLookup] = useState<OrgPlanActivationLookup | null>(initialLookup ?? null);
  const [lookupPending, startLookup] = useTransition();
  const [activatePending, startActivate] = useTransition();

  const canActivate = Boolean(lookup?.found && lookup.claimed);

  return (
    <form
      className="max-w-lg rounded-lg border border-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const organizationId = String(fd.get('organization_id') ?? '').trim();
        if (!organizationId) {
          toast.error('Organization ID is required');
          return;
        }
        if (!canActivate) {
          toast.error('Look up a claimed organization before activating a plan');
          return;
        }

        startActivate(async () => {
          try {
            await onActivate({
              organizationId,
              planTier: String(fd.get('plan_tier')) as PlanTier,
              billingInterval: String(fd.get('billing_interval')) as BillingInterval,
              periodMonths: Number(fd.get('period_months') || 12),
            });
            toast.success(successMessage);
            const refreshed = await onLookup(organizationId);
            setLookup(refreshed);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Activation failed');
          }
        });
      }}
    >
      <FormStack>
        <FormField label={organizationIdLabel} htmlFor="organization_id">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="organization_id"
              name="organization_id"
              defaultValue={initialOrganizationId}
              readOnly={lockOrganizationId}
              required
              disabled={activatePending}
              className={lockOrganizationId ? 'bg-muted/40' : undefined}
            />
            {!lockOrganizationId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={lookupPending}
                loadingLabel="Looking up…"
                disabled={activatePending}
                onClick={() => {
                  const input = document.getElementById('organization_id') as HTMLInputElement | null;
                  const organizationId = input?.value.trim() ?? '';
                  if (!organizationId) {
                    toast.error('Enter an organization ID first');
                    return;
                  }
                  startLookup(async () => {
                    try {
                      const result = await onLookup(organizationId);
                      setLookup(result);
                      if (!result.found) {
                        toast.error('Organization not found');
                      }
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Lookup failed');
                    }
                  });
                }}
              >
                Look up
              </Button>
            ) : null}
          </div>
        </FormField>

        {lookup ? (
          <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
            {lookup.found ? (
              <>
                <p className="font-medium text-foreground">{lookup.organizationName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={lookup.claimed ? 'success' : 'warning'}>
                    {lookup.claimed ? 'Claimed' : 'Unclaimed'}
                  </Badge>
                  {lookup.activePlanTier ? (
                    <Badge variant="secondary">
                      Current: {lookup.activePlanTier}
                      {lookup.activePlanProvider ? ` · ${lookup.activePlanProvider}` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Free tier</Badge>
                  )}
                </div>
                {lookup.activePeriodEnd ? (
                  <p className="mt-2 text-muted">
                    Period ends {new Date(lookup.activePeriodEnd).toLocaleDateString()}
                  </p>
                ) : null}
                {!lookup.claimed ? (
                  <p className="mt-2 text-orange-800">
                    This organization must complete Care Portal claim before a plan can be activated.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted">No organization found for that ID.</p>
            )}
          </div>
        ) : null}

        <FormField label="Plan" htmlFor="plan_tier">
          <Select id="plan_tier" name="plan_tier" defaultValue="basic" disabled={activatePending || !canActivate}>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </Select>
        </FormField>
        <FormField label="Interval" htmlFor="billing_interval">
          <Select
            id="billing_interval"
            name="billing_interval"
            defaultValue="yearly"
            disabled={activatePending || !canActivate}
          >
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
            disabled={activatePending || !canActivate}
          />
        </FormField>
        <FormActions className="justify-start">
          <Button
            type="submit"
            loading={activatePending}
            loadingLabel="Activating…"
            disabled={!canActivate}
          >
            Activate plan
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
