import Link from 'next/link';
import { notFound } from 'next/navigation';

import { emptyFhirBundle } from '@/domains/providers/fhir-bundle';
import {
  getHealthcareServiceFhirBundle,
  getProviderHealthcareService,
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

export default async function HealthcareServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fhir?: string }>;
}) {
  const { id } = await params;
  const { fhir } = await searchParams;

  let service;
  try {
    service = await getProviderHealthcareService(id);
  } catch {
    service = null;
  }
  if (!service || service.deleted_at) notFound();

  let fhirBundle;
  try {
    fhirBundle = await getHealthcareServiceFhirBundle(service);
  } catch {
    fhirBundle = emptyFhirBundle();
  }

  const bundleJson = JSON.stringify(fhirBundle, null, 2);
  const openFhir = fhir === '1' || fhir === 'true';
  const locationHref = service.location_id
    ? `/dashboard/providers/${service.location_id}`
    : null;
  const organizationHref = `/dashboard/providers/organizations/${service.organization_id}`;

  return (
    <div>
      <PageHeader
        title={service.name}
        description="HealthcareService catalog row. FHIR is read-only from the ingested resource column."
      >
        <ProviderFhirViewButton
          subjectName={service.name}
          subtitle={`Read-only HealthcareService resource for ${service.name}`}
          bundleJson={bundleJson}
          resourceCount={fhirBundle.total}
          initialOpen={openFhir}
        />
        <Link
          href="/dashboard/providers?view=services"
          className="text-sm text-muted hover:text-foreground"
        >
          Back to list
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="p-6">
          <dl>
            <Row label="Service ID">
              <code className="break-all text-xs">{service.id}</code>
            </Row>
            <Row label="Type">
              <Badge variant="secondary">{service.service_type ?? '—'}</Badge>
            </Row>
            <Row label="Active">{service.active ? 'Yes' : 'No'}</Row>
            <Row label="Organization ID">
              <Link href={organizationHref} className="break-all font-mono text-xs text-primary hover:underline">
                {service.organization_id}
              </Link>
            </Row>
            <Row label="Location ID">
              {service.location_id && locationHref ? (
                <Link
                  href={locationHref}
                  className="break-all font-mono text-xs text-primary hover:underline"
                >
                  {service.location_id}
                </Link>
              ) : (
                '—'
              )}
            </Row>
            <Row label="Source">{service.source ?? '—'}</Row>
            <Row label="Last ingested">{service.last_ingested_at ?? '—'}</Row>
            <Row label="FHIR">
              {fhirBundle.total > 0 ? (
                <span className="text-muted">
                  HealthcareService — use{' '}
                  <strong className="font-medium text-foreground">View FHIR</strong> above
                </span>
              ) : (
                <span className="text-muted">
                  No `resource` JSON on this service. Re-ingest the HealthcareService workbook.
                </span>
              )}
            </Row>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
