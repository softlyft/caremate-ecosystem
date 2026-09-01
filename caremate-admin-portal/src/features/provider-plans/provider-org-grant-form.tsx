'use client';

import {
  grantProviderOrgSubscription,
  lookupProviderOrgPlanActivation,
} from '@/domains/provider-plans/actions';
import { OrgPlanActivationForm } from '@/features/plans/org-plan-activation-form';
import type { OrgPlanActivationLookup } from '@/features/plans/org-plan-activation-types';

export function ProviderOrgGrantForm({
  organizationId,
  initialLookup,
}: {
  organizationId?: string;
  initialLookup?: OrgPlanActivationLookup | null;
} = {}) {
  return (
    <OrgPlanActivationForm
      organizationIdLabel="Provider organization ID (UUID)"
      initialOrganizationId={organizationId}
      lockOrganizationId={Boolean(organizationId)}
      initialLookup={initialLookup}
      onLookup={lookupProviderOrgPlanActivation}
      onActivate={grantProviderOrgSubscription}
      successMessage="Provider plan activated"
    />
  );
}
