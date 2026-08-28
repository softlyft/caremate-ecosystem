import { PageHeader, PageShell } from '@/components/page-header';
import { TextLink } from '@/components/ui/text-link';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { LocationForm } from '@/components/features/location-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewLocationPage() {
  const session = await requireProviderSession();
  const canManage = canManageOrg(session.activeRole);

  if (!canManage) {
    return (
      <PageShell>
        <PageHeader
          title="Add location"
          description="Only owners and administrators can create locations."
        />
        <TextLink href="/app/organization">Back to organization</TextLink>
      </PageShell>
    );
  }

  return (
    <PageShell className="mx-auto max-w-2xl">
      <TextLink href="/app/organization">← Organization</TextLink>
      <PageHeader title="Add location" description={session.activeOrganizationName} />

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
    </PageShell>
  );
}
