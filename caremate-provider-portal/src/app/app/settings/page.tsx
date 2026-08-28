import { requireProviderSession, getCareSession } from '@/lib/auth';
import { OrgSwitcher } from '@/components/features/org-switcher';
import { OrgSettingsOverview } from '@/components/features/org-settings-overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardLink } from '@/components/ui/card-link';

export default async function SettingsPage() {
  const session = await requireProviderSession();
  const care = await getCareSession();

  return (
    <OrgSettingsOverview
      subtitle="Account and organization preferences"
      email={session.user.email ?? ''}
      role={session.activeRole}
      accountDescription="Signed-in provider user"
      orgSwitcherDescription="Switch between organizations if you belong to more than one"
      orgSwitcher={
        <OrgSwitcher
          memberships={session.memberships}
          activeOrganizationId={session.activeOrganizationId}
        />
      }
      showWorkspaceSwitcher={Boolean(care?.hasProvider && care.hasPayer)}
      currentKind="provider"
      billingCard={{
        title: 'Private Care Team billing',
        description:
          'Plan seats, patient caps, and Paystack upgrades (separate from patient Premium)',
        href: '/app/settings/billing',
        linkLabel: 'View plan & upgrade →',
      }}
      extraCards={
        <>
          <CardLink
            title="Modules"
            description="Activate optional capabilities such as Laboratory for this organization"
            href="/app/settings/modules"
            linkLabel="Manage modules →"
          />

          <Card>
            <CardHeader>
              <CardTitle>Bootstrap note</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              <p>
                CareMate admins must seed{' '}
                <code className="text-foreground">provider_org_members</code> (and optionally{' '}
                <code className="text-foreground">provider_profiles</code>) before staff can sign
                in. Use:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-foreground">
                {`npm run bootstrap:member -w caremate-provider-portal -- \\
  user@example.com <organization-uuid> owner`}
              </pre>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
