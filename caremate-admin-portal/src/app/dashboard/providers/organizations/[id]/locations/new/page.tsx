import { notFound } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { getOrganizationContactEmail, getProviderOrganization } from '@/domains/providers/repository';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import { LocationForm } from '@/features/providers/location-form';

export default async function NewLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organizationId } = await params;
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);

  const organization = await getProviderOrganization(organizationId);
  if (!organization || organization.deleted_at) notFound();

  const contactEmail = await getOrganizationContactEmail(organizationId).catch(() => null);

  if (!canEdit) {
    return (
      <div>
        <PageHeader title="Create location" description="Editors only" />
        <TextLink href={`/dashboard/providers/organizations/${organizationId}`}>
          Back to organization
        </TextLink>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Create location"
        description={`Add a site under ${organization.name}`}
      >
        <TextLink
          href={`/dashboard/providers/organizations/${organizationId}`}
          className="text-muted hover:text-foreground"
        >
          Back to organization
        </TextLink>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationForm
            mode="create"
            organizationId={organizationId}
            contactEmail={contactEmail}
          />
        </CardContent>
      </Card>
    </div>
  );
}
