import { notFound } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import {
  getProviderLocation,
  getProviderOrganization,
} from '@/domains/providers/repository';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import { HealthcareServiceForm } from '@/features/providers/healthcare-service-form';

export default async function NewServicePage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const { id: organizationId, locationId } = await params;
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);

  const organization = await getProviderOrganization(organizationId);
  if (!organization || organization.deleted_at) notFound();

  const location = await getProviderLocation(locationId);
  if (!location || location.deleted_at || location.organization_id !== organizationId) {
    notFound();
  }

  if (!canEdit) {
    return (
      <div>
        <PageHeader title="Create service" description="Editors only" />
        <TextLink
          href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}`}
        >
          Back to location
        </TextLink>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Create healthcare service"
        description={`Add a service at ${location.name}`}
      >
        <TextLink
          href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}`}
          className="text-muted hover:text-foreground"
        >
          Back to location
        </TextLink>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Healthcare service</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthcareServiceForm
            mode="create"
            organizationId={organizationId}
            locationId={locationId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
