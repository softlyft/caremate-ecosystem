import { notFound } from 'next/navigation';

import { getPayerOrganization } from '@/domains/payers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DescriptionRow } from '@/components/ui/detail-row';
import { TextLink } from '@/components/ui/text-link';
import { PayerOrganizationForm } from '@/features/payers/organization-form';
import { ArchivePayerOrganizationButton } from '@/features/payers/archive-payer-button';

export default async function PayerOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);

  let organization;
  try {
    organization = await getPayerOrganization(id);
  } catch {
    organization = null;
  }
  if (!organization || organization.deleted_at) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={organization.name}
        description="Health insurance / payer catalog row for Care Portal claim."
      >
        <Badge variant={organization.active ? 'success' : 'secondary'}>
          {organization.active ? 'Active' : 'Inactive'}
        </Badge>
        {canEdit ? <ArchivePayerOrganizationButton organizationId={organization.id} /> : null}
        <TextLink href="/dashboard/payers" className="text-muted hover:text-foreground">
          Back to list
        </TextLink>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <PayerOrganizationForm mode="edit" organization={organization} />
          ) : (
            <dl>
              <DescriptionRow label="Name">{organization.name}</DescriptionRow>
              <DescriptionRow label="Claim email">{organization.email ?? '—'}</DescriptionRow>
              <DescriptionRow label="Phone">{organization.phone ?? '—'}</DescriptionRow>
              <DescriptionRow label="Website">{organization.website ?? '—'}</DescriptionRow>
              <DescriptionRow label="Address">{organization.address ?? '—'}</DescriptionRow>
              <DescriptionRow label="Active">{organization.active ? 'Yes' : 'No'}</DescriptionRow>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
