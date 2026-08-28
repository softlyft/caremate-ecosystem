'use client';

import { switchActiveOrganizationAction } from '@/domains/org/actions';
import type { ProviderMembership } from '@/lib/auth';
import { OrgMembershipSwitcher } from '@/components/features/org-membership-switcher';

export function OrgSwitcher({
  memberships,
  activeOrganizationId,
}: {
  memberships: ProviderMembership[];
  activeOrganizationId: string;
}) {
  return (
    <OrgMembershipSwitcher
      memberships={memberships}
      activeOrganizationId={activeOrganizationId}
      switchAction={switchActiveOrganizationAction}
      emptyMessage="You belong to one organization. Ask a CareMate admin to add more memberships if needed."
    />
  );
}
