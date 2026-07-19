import { requireProviderSession } from '@/lib/auth';
import { OrgSwitcher } from '@/components/features/org-switcher';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const session = await requireProviderSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted">Account and organization preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed-in provider user</CardDescription>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active organization</CardTitle>
          <CardDescription>
            Switch between organizations if you belong to more than one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgSwitcher
            memberships={session.memberships}
            activeOrganizationId={session.activeOrganizationId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bootstrap note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          <p>
            CareMate admins must seed <code className="text-foreground">provider_org_members</code>{' '}
            (and optionally <code className="text-foreground">provider_profiles</code>) before staff
            can sign in. Use:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-foreground">
            {`npm run bootstrap:member -w caremate-provider-portal -- \\
  user@example.com <organization-uuid> owner`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
