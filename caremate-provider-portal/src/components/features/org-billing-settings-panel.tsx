import type { ReactNode } from 'react';
import { PageHeader, PageShell } from '@/components/page-header';
import { TextLink } from '@/components/ui/text-link';
import { OrgPlanCheckoutButtons } from '@/components/features/org-plan-checkout-buttons';
import type { StartOrgCheckoutAction } from '@/components/features/org-plan-checkout-buttons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function OrgBillingSettingsPanel({
  title,
  description,
  paid,
  canManage,
  websitePricingUrl,
  checkoutAction,
  settingsHref,
  entitlements,
  usageRows,
  extraBadges,
}: {
  title: string;
  description: string;
  paid: boolean;
  canManage: boolean;
  websitePricingUrl: string;
  checkoutAction?: StartOrgCheckoutAction;
  settingsHref: string;
  entitlements: {
    plan_tier: string;
    billing_interval: string | null;
    patient_connection_cap: number;
    current_period_end?: string | null;
  };
  usageRows: ReactNode;
  extraBadges?: ReactNode;
}) {
  return (
    <PageShell>
      <PageHeader title={title} description={description} />

      {paid ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Payment received — entitlements refresh after Paystack confirms the charge.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Resolved entitlement for this organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted">Tier</span>
            <Badge variant="secondary">{entitlements.plan_tier}</Badge>
            {entitlements.billing_interval ? (
              <Badge variant="secondary">{entitlements.billing_interval}</Badge>
            ) : null}
            {extraBadges}
          </div>
          {usageRows}
          {entitlements.current_period_end ? (
            <p className="text-muted">
              Period ends {new Date(entitlements.current_period_end).toLocaleDateString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade with Paystack</CardTitle>
            <CardDescription>Basic and Pro · monthly or yearly (10% off yearly) · NGN only</CardDescription>
          </CardHeader>
          <CardContent>
            <OrgPlanCheckoutButtons
              websitePricingUrl={websitePricingUrl}
              checkoutAction={checkoutAction}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted">Only owners and administrators can change the plan.</p>
      )}

      <TextLink href={settingsHref}>← Back to settings</TextLink>
    </PageShell>
  );
}
