'use client';

import type { ProviderModuleKey } from '@/domains/modules/catalog';
import { CarePortalShell } from '@/components/care-portal-shell';
import { PROVIDER_NAV_GROUPS } from '@/lib/provider-nav';

export function AppShell({
  children,
  email,
  role,
  organizationName,
  enabledModules,
}: {
  children: React.ReactNode;
  email: string;
  role: Parameters<typeof CarePortalShell>[0]['role'];
  organizationName: string;
  enabledModules: ProviderModuleKey[];
}) {
  return (
    <CarePortalShell
      email={email}
      role={role}
      organizationName={organizationName}
      workspaceSubtitle="Care Portal"
      navGroups={PROVIDER_NAV_GROUPS}
      enabledModules={enabledModules}
    >
      {children}
    </CarePortalShell>
  );
}
