import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import {
  getProviderLocation,
  getProviderOrganization,
} from '@/domains/providers/repository';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <Link
          href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}`}
          className="text-sm text-primary hover:underline"
        >
          Back to location
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Create healthcare service"
        description={`Add a service at ${location.name}`}
      >
        <Link
          href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          Back to location
        </Link>
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
