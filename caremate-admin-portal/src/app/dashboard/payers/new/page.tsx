import Link from 'next/link';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayerOrganizationForm } from '@/features/payers/organization-form';

export default async function NewPayerOrganizationPage() {
  const session = await getPortalSession();
  if (!canEditCatalog(session?.role)) {
    return (
      <div>
        <PageHeader title="Create health insurance organization" description="Editors only" />
        <p className="text-sm text-muted">
          You do not have permission to create health insurance organizations.
        </p>
        <Link href="/dashboard/payers" className="mt-4 inline-block text-primary hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Create health insurance organization"
        description="Add a payer to the Care Portal catalog. Set a claim contact email so the org can claim."
      >
        <Link href="/dashboard/payers" className="text-sm text-muted hover:text-foreground">
          Back to list
        </Link>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <PayerOrganizationForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
