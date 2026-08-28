import { notFound } from 'next/navigation';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { getLocationForOrganization } from '@/domains/catalog/repository';
import { HealthcareServiceForm } from '@/components/features/healthcare-service-form';
import { PageHeader, PageShell } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';

export default async function NewServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: locationId } = await params;
  const session = await requireProviderSession();
  const canManage = canManageOrg(session.activeRole);
  const location = await getLocationForOrganization(session.activeOrganizationId, locationId);
  if (!location) notFound();

  if (!canManage) {
    return (
      <PageShell>
        <PageHeader
          title="Add healthcare service"
          description="Only owners and administrators can create services."
        />
        <TextLink href={`/app/organization/locations/${locationId}`}>Back to location</TextLink>
      </PageShell>
    );
  }

  return (
    <PageShell className="mx-auto max-w-2xl">
      <TextLink href={`/app/organization/locations/${locationId}`}>← {location.name}</TextLink>
      <PageHeader title="Add healthcare service" description={`At ${location.name}`} />

      <Card>
        <CardHeader>
          <CardTitle>Service details</CardTitle>
          <CardDescription>
            Creates a catalog healthcare service linked to this location, then refreshes Nearby.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HealthcareServiceForm mode="create" locationId={locationId} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
