import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { ProviderPlansNav } from '@/features/provider-plans/provider-plans-nav';
import { ProviderOrgGrantForm } from '@/features/provider-plans/provider-org-grant-form';
import { listProviderOrgSubscriptions } from '@/domains/provider-plans/repository';

export default async function ProviderPlanGrantsPage() {
  const session = await getPortalSession();
  const canEdit = canManageBilling(session?.role);

  let subs: Awaited<ReturnType<typeof listProviderOrgSubscriptions>> = [];
  try {
    subs = await listProviderOrgSubscriptions(50);
  } catch {
    subs = [];
  }

  return (
    <div>
      <PageHeader
        title="Provider plan grants"
        description="Complimentary or Enterprise entitlements without Paystack (service-admin)."
      />

      <ProviderPlansNav current="grants" />

      {canEdit ? <ProviderOrgGrantForm /> : (
        <p className="mb-4 rounded-md border border-border bg-white p-3 text-sm text-muted">
          View only — admins can grant plans.
        </p>
      )}

      <div className="mt-8">
        <h2 className="text-base font-semibold text-foreground">Recent subscriptions</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Org</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Period end</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={5}>
                    No provider org subscriptions yet.
                  </td>
                </tr>
              ) : (
                subs.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{s.organization_id}</td>
                    <td className="px-3 py-2">{s.plan_tier}</td>
                    <td className="px-3 py-2">{s.status}</td>
                    <td className="px-3 py-2">{s.provider}</td>
                    <td className="px-3 py-2">
                      {s.current_period_end
                        ? new Date(s.current_period_end).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
