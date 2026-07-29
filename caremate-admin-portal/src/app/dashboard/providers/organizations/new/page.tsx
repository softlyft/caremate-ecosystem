import Link from 'next/link';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationForm } from '@/features/providers/organization-form';

export default async function NewOrganizationPage() {
  const session = await getPortalSession();
  if (!canEditCatalog(session?.role)) {
    return (
      <div>
        <PageHeader title="Create organization" description="Editors only" />
        <p className="text-sm text-muted">You do not have permission to create organizations.</p>
        <Link href="/dashboard/providers?view=organizations" className="mt-4 inline-block text-primary hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Create organization" description="Add a provider organization to the shared catalog.">
        <Link
          href="/dashboard/providers?view=organizations"
          className="text-sm text-muted hover:text-foreground"
        >
          Back to list
        </Link>
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
