'use client';

import {
  grantPayerOrgSubscription,
  lookupPayerOrgPlanActivation,
} from '@/domains/payer-plans/actions';
import { OrgPlanActivationForm } from '@/features/plans/org-plan-activation-form';
import type { OrgPlanActivationLookup } from '@/features/plans/org-plan-activation-types';

export function PayerOrgGrantForm({
  organizationId,
  initialLookup,
}: {
  organizationId?: string;
  initialLookup?: OrgPlanActivationLookup | null;
} = {}) {
  return (
    <OrgPlanActivationForm
      organizationIdLabel="Payer organization ID (UUID)"
      initialOrganizationId={organizationId}
      lockOrganizationId={Boolean(organizationId)}
      initialLookup={initialLookup}
      onLookup={lookupPayerOrgPlanActivation}
      onActivate={grantPayerOrgSubscription}
      successMessage="Payer plan activated"
    />
  );
}
