import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { getLocationForOrganization } from '@/domains/catalog/repository';
import { HealthcareServiceForm } from '@/components/features/healthcare-service-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-brand-navy">Add healthcare service</h1>
        <p className="text-sm text-muted">Only owners and administrators can create services.</p>
        <Link
          href={`/app/organization/locations/${locationId}`}
          className="text-sm text-primary hover:underline"
        >
          Back to location
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app/organization/locations/${locationId}`}
          className="text-sm text-primary hover:underline"
        >
          ← {location.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
          Add healthcare service
        </h1>
        <p className="mt-1 text-sm text-muted">At {location.name}</p>
      </div>

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
    </div>
  );
}
