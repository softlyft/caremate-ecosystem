import { requirePayerSession, getCareSession } from '@/lib/auth';
import {
  PayerOrgSwitcher,
  WorkspaceKindSwitcher,
} from '@/components/features/payer-org-switcher';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function PayerSettingsPage() {
  const session = await requirePayerSession();
  const care = await getCareSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted">Account preferences for your payer organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed-in Care Portal user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted">Email: </span>
            <span className="font-medium">{session.user.email}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted">Active role:</span>
            <Badge variant="secondary">{PROVIDER_ROLE_LABELS[session.activeRole]}</Badge>
          </p>
          <p>
            <span className="text-muted">Organization: </span>
            <span className="font-medium">{session.activeOrganizationName}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active organization</CardTitle>
          <CardDescription>
            Switch between payer organizations if you belong to more than one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayerOrgSwitcher
            memberships={session.memberships}
            activeOrganizationId={session.activeOrganizationId}
          />
        </CardContent>
      </Card>

      {care?.hasProvider && care.hasPayer ? (
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              You also have a provider organization. Switch Care Portal workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceKindSwitcher hasProvider hasPayer currentKind="payer" />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>Use the sidebar Sign out control to end your session</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Go to sign in →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
