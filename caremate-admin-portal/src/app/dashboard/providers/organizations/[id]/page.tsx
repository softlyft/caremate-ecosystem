import Link from 'next/link';
import { notFound } from 'next/navigation';

import { emptyFhirBundle } from '@/domains/providers/fhir-bundle';
import {
  getOrganizationFhirBundle,
  getProviderOrganization,
  listLocationsForOrganization,
} from '@/domains/providers/repository';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProviderFhirViewButton } from '@/features/providers/provider-fhir-view-button';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fhir?: string }>;
}) {
  const { id } = await params;
  const { fhir } = await searchParams;

  let organization;
  try {
    organization = await getProviderOrganization(id);
  } catch {
    organization = null;
  }
  if (!organization || organization.deleted_at) notFound();

  let fhirBundle;
  try {
    fhirBundle = await getOrganizationFhirBundle(organization);
  } catch {
    fhirBundle = emptyFhirBundle();
  }

  let locations: Awaited<ReturnType<typeof listLocationsForOrganization>> = [];
  try {
    locations = await listLocationsForOrganization(organization.id);
  } catch {
    locations = [];
  }

  const bundleJson = JSON.stringify(fhirBundle, null, 2);
  const openFhir = fhir === '1' || fhir === 'true';

  return (
    <div>
      <PageHeader
        title={organization.name}
        description="Organization catalog row. FHIR is read-only from the ingested resource column."
      >
        <ProviderFhirViewButton
          subjectName={organization.name}
          subtitle={`Read-only Organization resource for ${organization.name}`}
          bundleJson={bundleJson}
          resourceCount={fhirBundle.total}
          initialOpen={openFhir}
        />
        <Link
          href="/dashboard/providers?view=organizations"
          className="text-sm text-muted hover:text-foreground"
        >
          Back to list
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="p-6">
          <dl>
            <Row label="Organization ID">
              <code className="break-all text-xs">{organization.id}</code>
            </Row>
            <Row label="Active">
              <Badge variant="secondary">{organization.active ? 'Yes' : 'No'}</Badge>
            </Row>
            <Row label="Source">{organization.source ?? '—'}</Row>
            <Row label="Last ingested">{organization.last_ingested_at ?? '—'}</Row>
            <Row label="Related locations">
              {locations.length === 0 ? (
                '—'
              ) : (
                <ul className="space-y-1">
                  {locations.map((loc) => (
                    <li key={loc.id}>
                      <Link
                        href={`/dashboard/providers/${loc.id}`}
                        className="text-primary hover:underline"
                      >
                        {loc.name}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-muted">{loc.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Row>
            <Row label="FHIR">
              {fhirBundle.total > 0 ? (
                <span className="text-muted">
                  Organization — use{' '}
                  <strong className="font-medium text-foreground">View FHIR</strong> above
                </span>
              ) : (
                <span className="text-muted">
                  No `resource` JSON on this organization. Re-ingest the Organization workbook.
                </span>
              )}
            </Row>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
