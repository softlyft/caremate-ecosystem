import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import { OrganizationForm } from '@/features/providers/organization-form';

export default async function NewOrganizationPage() {
  const session = await getPortalSession();
  if (!canEditCatalog(session?.role)) {
    return (
      <div>
        <PageHeader title="Create organization" description="Editors only" />
        <p className="text-sm text-muted">You do not have permission to create organizations.</p>
        <TextLink href="/dashboard/providers?view=organizations" className="mt-4 inline-block">
          Back to list
        </TextLink>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Create organization" description="Add a provider organization to the shared catalog.">
        <TextLink href="/dashboard/providers?view=organizations" className="text-muted hover:text-foreground">
          Back to list
        </TextLink>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
