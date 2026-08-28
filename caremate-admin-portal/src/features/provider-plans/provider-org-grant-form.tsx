'use client';

import { grantProviderOrgSubscription } from '@/domains/provider-plans/actions';
import { OrgGrantForm } from '@/features/plans/org-grant-form';

export function ProviderOrgGrantForm() {
  return (
    <OrgGrantForm
      organizationIdLabel="Provider organization ID (UUID)"
      successMessage="Provider org plan granted"
      onGrant={grantProviderOrgSubscription}
    />
  );
}
