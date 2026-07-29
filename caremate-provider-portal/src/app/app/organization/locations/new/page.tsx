import Link from 'next/link';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { LocationForm } from '@/components/features/location-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewLocationPage() {
  const session = await requireProviderSession();
  const canManage = canManageOrg(session.activeRole);

  if (!canManage) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-brand-navy">Add location</h1>
        <p className="text-sm text-muted">Only owners and administrators can create locations.</p>
        <Link href="/app/organization" className="text-sm text-primary hover:underline">
          Back to organization
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/organization" className="text-sm text-primary hover:underline">
          ← Organization
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">Add location</h1>
        <p className="mt-1 text-sm text-muted">{session.activeOrganizationName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location details</CardTitle>
          <CardDescription>
            Creates a catalog site under your organization (provider_locations), then refreshes the
            Nearby pin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
