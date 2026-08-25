import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPayerOrganization } from '@/domains/payers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayerOrganizationForm } from '@/features/payers/organization-form';
import { ArchivePayerOrganizationButton } from '@/features/payers/archive-payer-button';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function PayerOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);

  let organization;
  try {
    organization = await getPayerOrganization(id);
  } catch {
    organization = null;
  }
  if (!organization || organization.deleted_at) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={organization.name}
        description="Health insurance / payer catalog row for Care Portal claim."
      >
        <Badge variant={organization.active ? 'success' : 'secondary'}>
          {organization.active ? 'Active' : 'Inactive'}
        </Badge>
        {canEdit ? <ArchivePayerOrganizationButton organizationId={organization.id} /> : null}
        <Link href="/dashboard/payers" className="text-sm text-muted hover:text-foreground">
          Back to list
        </Link>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <PayerOrganizationForm mode="edit" organization={organization} />
          ) : (
            <dl>
              <Row label="Name">{organization.name}</Row>
              <Row label="Claim email">{organization.email ?? '—'}</Row>
              <Row label="Phone">{organization.phone ?? '—'}</Row>
              <Row label="Website">{organization.website ?? '—'}</Row>
              <Row label="Address">{organization.address ?? '—'}</Row>
              <Row label="Active">{organization.active ? 'Yes' : 'No'}</Row>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
