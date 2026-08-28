import { requirePayerSession, getCareSession } from '@/lib/auth';
import { PayerOrgSwitcher } from '@/components/features/payer-org-switcher';
import { OrgSettingsOverview } from '@/components/features/org-settings-overview';

export default async function PayerSettingsPage() {
  const session = await requirePayerSession();
  const care = await getCareSession();

  return (
    <OrgSettingsOverview
      subtitle="Account preferences for your payer organization"
      email={session.user.email ?? ''}
      role={session.activeRole}
      organizationName={session.activeOrganizationName}
      accountDescription="Signed-in Care Portal user"
      orgSwitcherDescription="Switch between payer organizations if you belong to more than one"
      orgSwitcher={
        <PayerOrgSwitcher
          memberships={session.memberships}
          activeOrganizationId={session.activeOrganizationId}
        />
      }
      showWorkspaceSwitcher={Boolean(care?.hasProvider && care.hasPayer)}
      currentKind="payer"
      billingCard={{
        title: 'Billing',
        description: 'Support Team plan, seats, and Paystack checkout',
        href: '/payer/settings/billing',
        linkLabel: 'Manage Support Team billing →',
      }}
    />
  );
}
