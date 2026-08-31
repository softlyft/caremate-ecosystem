'use client';

import { switchActivePayerOrganizationAction } from '@/domains/org/actions';
import type { PayerMembership } from '@/lib/auth';
import { OrgMembershipSwitcher } from '@/components/features/org-membership-switcher';

export function PayerOrgSwitcher({
  memberships,
  activeOrganizationId,
}: {
  memberships: PayerMembership[];
  activeOrganizationId: string;
}) {
  return (
    <OrgMembershipSwitcher
      memberships={memberships}
      activeOrganizationId={activeOrganizationId}
      switchAction={switchActivePayerOrganizationAction}
      emptyMessage="You belong to one payer organization. Ask a CareMate admin to add more memberships if needed."
      selectId="payer_organization_id"
    />
  );
}
