import { requirePayerSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { getPayerOrgPlanUsage } from '@/domains/payer-billing/repository';
import { startPayerOrgCheckoutAction } from '@/domains/payer-billing/actions';
import { OrgBillingSettingsPanel } from '@/components/features/org-billing-settings-panel';
import { Badge } from '@/components/ui/badge';

export default async function PayerBillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await requirePayerSession();
  const params = await searchParams;
  const usage = await getPayerOrgPlanUsage(session.activeOrganizationId);
  const canManage = canManageOrg(session.activeRole);
  const website =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '') || 'https://www.getcaremate.com';

  const { entitlements, supportTeamMemberCount, approvedPatientCount, approvedProviderConnectionCount } =
    usage;

  return (
    <OrgBillingSettingsPanel
      title="Support Team billing"
      description="Org Messages with connected patients stay free. Support Team seats gate 1:1 patient chat."
      paid={params.paid === '1'}
      canManage={canManage}
      websitePricingUrl={`${website}/payers/pricing`}
      checkoutAction={startPayerOrgCheckoutAction}
      settingsHref="/payer/settings"
      entitlements={entitlements}
      extraBadges={
        entitlements.group_chat_enabled ? <Badge variant="secondary">Group chat</Badge> : null
      }
      usageRows={
        <>
          <p>
            Support Team seats: <strong>{supportTeamMemberCount}</strong> /{' '}
            <strong>{entitlements.support_team_seat_limit}</strong>
          </p>
          <p>
            Approved patients: <strong>{approvedPatientCount}</strong> /{' '}
            <strong>{entitlements.patient_connection_cap}</strong>
          </p>
          <p>
            Approved provider connections: <strong>{approvedProviderConnectionCount}</strong> /{' '}
            <strong>{entitlements.provider_connection_cap}</strong>
          </p>
        </>
      }
    />
  );
}
