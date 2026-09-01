import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { getProviderOrgPlanUsage } from '@/domains/billing/repository';
import { OrgBillingSettingsPanel } from '@/components/features/org-billing-settings-panel';

export default async function ProviderBillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await requireProviderSession();
  const params = await searchParams;
  const usage = await getProviderOrgPlanUsage(session.activeOrganizationId);
  const canManage = canManageOrg(session.activeRole);
  const website =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '') || 'https://www.getcaremate.com';

  const { entitlements, pctMemberCount, approvedPatientCount, approvedPayerConnectionCount } =
    usage;

  return (
    <OrgBillingSettingsPanel
      title="Private Care Team billing"
      description="Org Messages with connected patients stay free. Private Care Team seats gate 1:1 patient chat."
      paid={params.paid === '1'}
      canManage={canManage}
      websitePricingUrl={`${website}/providers/pricing`}
      settingsHref="/app/settings"
      entitlements={entitlements}
      usageRows={
        <>
          <p>
            Care team seats: <strong>{pctMemberCount}</strong> /{' '}
            <strong>{entitlements.pct_seat_limit}</strong>
          </p>
          <p>
            Approved patients: <strong>{approvedPatientCount}</strong> /{' '}
            <strong>{entitlements.patient_connection_cap}</strong>
          </p>
          <p>
            Approved payer connections: <strong>{approvedPayerConnectionCount}</strong> /{' '}
            <strong>{entitlements.payer_connection_cap}</strong>
          </p>
        </>
      }
    />
  );
}
