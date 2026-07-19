import { requireProviderSession } from '@/lib/auth';
import { getOrganizationProfile } from '@/domains/org/repository';
import { OrgProfileForm } from '@/components/features/org-profile-form';
import { canManageOrg } from '@/constants/roles';
import { ORG_TYPE_LABELS } from '@/constants/org-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function OrganizationPage() {
  const session = await requireProviderSession();
  const data = await getOrganizationProfile(session.activeOrganizationId);
  const canManage = canManageOrg(session.activeRole);

  const verification = data?.profile?.verification_status ?? 'pending';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Organization</h1>
          <p className="mt-1 text-sm text-muted">{data?.organization.name}</p>
        </div>
        <Badge
          variant={
            verification === 'verified'
              ? 'success'
              : verification === 'suspended'
                ? 'danger'
                : 'warning'
          }
        >
          {verification}
        </Badge>
        {data?.profile?.organization_type && (
          <Badge variant="secondary">
            {ORG_TYPE_LABELS[data.profile.organization_type]}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal profile</CardTitle>
          <CardDescription>
            {canManage
              ? 'Update how your organization appears for patient engagement'
              : 'View-only — owner or administrator can edit'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <OrgProfileForm
              profile={data?.profile ?? null}
              organizationName={data?.organization.name ?? session.activeOrganizationName}
            />
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Phone" value={data?.profile?.phone} />
              <Item label="Email" value={data?.profile?.email} />
              <Item label="Website" value={data?.profile?.website} />
              <Item label="Address" value={data?.profile?.address} />
              <Item label="Emergency contact" value={data?.profile?.emergency_contact} />
              <Item
                label="Services"
                value={(data?.profile?.services_offered ?? []).join(', ') || null}
              />
              <Item label="Description" value={data?.profile?.description} />
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}
