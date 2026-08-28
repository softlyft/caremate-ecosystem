'use client';

import { grantPayerOrgSubscription } from '@/domains/payer-plans/actions';
import { OrgGrantForm } from '@/features/plans/org-grant-form';

export function PayerOrgGrantForm() {
  return (
    <OrgGrantForm
      organizationIdLabel="Payer organization ID (UUID)"
      successMessage="Payer org plan granted"
      onGrant={grantPayerOrgSubscription}
    />
  );
}
