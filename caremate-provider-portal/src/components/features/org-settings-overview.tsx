import type { ReactNode } from 'react';
import { PageHeader, PageShell } from '@/components/page-header';
import { CardLink } from '@/components/ui/card-link';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkspaceKindSwitcher } from '@/components/features/workspace-kind-switcher';

export function OrgSettingsOverview({
  title = 'Settings',
  subtitle,
  email,
  role,
  organizationName,
  accountDescription,
  orgSwitcher,
  orgSwitcherDescription,
  showWorkspaceSwitcher,
  currentKind,
  billingCard,
  extraCards,
}: {
  title?: string;
  subtitle: string;
  email: string;
  role: keyof typeof PROVIDER_ROLE_LABELS;
  organizationName?: string;
  accountDescription: string;
  orgSwitcher: ReactNode;
  orgSwitcherDescription: string;
  showWorkspaceSwitcher: boolean;
  currentKind: 'provider' | 'payer';
  billingCard: {
    title: string;
    description: string;
    href: string;
    linkLabel: string;
  };
  extraCards?: ReactNode;
}) {
  const workspaceDescription =
    currentKind === 'provider'
      ? 'You also have a payer organization. Switch Care Portal workspace.'
      : 'You also have a provider organization. Switch Care Portal workspace.';

  return (
    <PageShell>
      <PageHeader title={title} description={subtitle} />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{accountDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted">Email: </span>
            <span className="font-medium">{email}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted">Active role:</span>
            <Badge variant="secondary">{PROVIDER_ROLE_LABELS[role]}</Badge>
          </p>
          {organizationName ? (
            <p>
              <span className="text-muted">Organization: </span>
              <span className="font-medium">{organizationName}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active organization</CardTitle>
          <CardDescription>{orgSwitcherDescription}</CardDescription>
        </CardHeader>
        <CardContent>{orgSwitcher}</CardContent>
      </Card>

      {showWorkspaceSwitcher ? (
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>{workspaceDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceKindSwitcher hasProvider hasPayer currentKind={currentKind} />
          </CardContent>
        </Card>
      ) : null}

      <CardLink
        title={billingCard.title}
        description={billingCard.description}
        href={billingCard.href}
        linkLabel={billingCard.linkLabel}
      />

      {extraCards}
    </PageShell>
  );
}
