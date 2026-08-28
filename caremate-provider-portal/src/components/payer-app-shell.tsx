'use client';

import { CarePortalShell } from '@/components/care-portal-shell';
import { PAYER_NAV_GROUPS } from '@/lib/payer-nav';
import type { ProviderMemberRole } from '@/types/database';

export function PayerAppShell({
  children,
  email,
  role,
  organizationName,
}: {
  children: React.ReactNode;
  email: string;
  role: ProviderMemberRole;
  organizationName: string;
}) {
  return (
    <CarePortalShell
      email={email}
      role={role}
      organizationName={organizationName}
      workspaceSubtitle="Care Portal · Payer"
      navGroups={PAYER_NAV_GROUPS}
    >
      {children}
    </CarePortalShell>
  );
}
