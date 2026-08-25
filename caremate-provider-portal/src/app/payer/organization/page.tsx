import { requirePayerSession } from '@/lib/auth';
import {
  getPayerOrganizationProfile,
  resolvePayerEditableDetails,
} from '@/domains/payer/repository';
import { canManageOrg } from '@/constants/roles';
import { PayerOrgProfileForm } from '@/components/features/payer-org-profile-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PayerOrganizationPage() {
  const session = await requirePayerSession();
  const data = await getPayerOrganizationProfile(session.activeOrganizationId);
  const canManage = canManageOrg(session.activeRole);
  const verification = data?.profile?.verification_status ?? 'pending';
  const details = data
    ? resolvePayerEditableDetails(data.organization, data.profile)
    : {
        description: null,
        website: null,
        logo_url: null,
        phone: null,
        address: null,
        email: null,
      };

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
        <Badge variant="secondary">Payer</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>
            {canManage
              ? 'Update the contact details patients see in the CareMate Health Insurance Directory.'
              : 'Contact details for your payer organization. Ask an owner or administrator to edit.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayerOrgProfileForm
            details={details}
            organizationName={data?.organization.name ?? session.activeOrganizationName}
            canEdit={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
