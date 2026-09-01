import { getPortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { PayerPlansNav } from '@/features/payer-plans/payer-plans-nav';
import { PayerOrgGrantForm } from '@/features/payer-plans/payer-org-grant-form';
import { listPayerOrgSubscriptions } from '@/domains/payer-plans/repository';

export default async function PayerPlanGrantsPage() {
  const session = await getPortalSession();
  const canEdit = canManageBilling(session?.role);

  let subs: Awaited<ReturnType<typeof listPayerOrgSubscriptions>> = [];
  try {
    subs = await listPayerOrgSubscriptions(50);
  } catch {
    subs = [];
  }

  return (
    <div>
      <PageHeader
        title="Payer plan activation"
        description="Activate paid entitlements for claimed payer orgs that pay outside Paystack (bank transfer, invoice, etc.)."
      />

      <PayerPlansNav current="grants" />

      {canEdit ? <PayerOrgGrantForm /> : (
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
                <th className="px-3 py-2">Group chat</th>
                <th className="px-3 py-2">Period end</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={6}>
                    No payer org subscriptions yet.
                  </td>
                </tr>
              ) : (
                subs.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{s.organization_id}</td>
                    <td className="px-3 py-2">{s.plan_tier}</td>
                    <td className="px-3 py-2">{s.status}</td>
                    <td className="px-3 py-2">{s.provider}</td>
                    <td className="px-3 py-2">{s.group_chat_enabled ? 'Yes' : 'No'}</td>
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
