import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProvider, getProviderFhirBundle } from '@/domains/providers/repository';
import { emptyFhirBundle } from '@/domains/providers/fhir-bundle';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PROVIDER_TYPE_LABELS } from '@/constants/content';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArchiveProviderButton } from '@/features/providers/archive-provider-button';
import { ProviderFhirViewButton } from '@/features/providers/provider-fhir-view-button';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function ProviderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fhir?: string }>;
}) {
  const session = await getPortalSession();
  const { id } = await params;
  const { fhir } = await searchParams;

  let provider;
  try {
    provider = await getProvider(id);
  } catch {
    provider = null;
  }
  if (!provider || provider.deleted_at) notFound();

  let fhirBundle;
  try {
    fhirBundle = await getProviderFhirBundle(provider);
  } catch {
    fhirBundle = emptyFhirBundle();
  }

  const canEdit = canEditCatalog(session?.role);
  const typeLabel =
    provider.type in PROVIDER_TYPE_LABELS
      ? PROVIDER_TYPE_LABELS[provider.type as keyof typeof PROVIDER_TYPE_LABELS]
      : provider.type;
  const bundleJson = JSON.stringify(fhirBundle, null, 2);
  const openFhir = fhir === '1' || fhir === 'true';

  return (
    <div>
      <PageHeader
        title={provider.name}
        description="Copy these UUIDs into Excel identifier / references to update on re-upload. FHIR view is read-only from ingested catalog resources."
      >
        <ProviderFhirViewButton
          subjectName={provider.name}
          subtitle={`Read-only Organization + Location + HealthcareService for ${provider.name}`}
          bundleJson={bundleJson}
          resourceCount={fhirBundle.total}
          initialOpen={openFhir}
        />
        <Link href="/dashboard/providers" className="text-sm text-muted hover:text-foreground">
          Back to list
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="p-6">
          <dl>
            <Row label="Location ID (PK)">
              <code className="break-all text-xs">{provider.location_id ?? provider.id}</code>
            </Row>
            <Row label="Organization ID">
              <code className="break-all text-xs">{provider.organization_id ?? '—'}</code>
            </Row>
            <Row label="Healthcare service IDs">
              {Array.isArray(provider.healthcare_service_ids) &&
              provider.healthcare_service_ids.length > 0 ? (
                <ul className="space-y-1">
                  {provider.healthcare_service_ids.map((hsId) => (
                    <li key={String(hsId)}>
                      <code className="break-all text-xs">{String(hsId)}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                '—'
              )}
            </Row>
            <Row label="Type">
              <Badge variant="secondary">{typeLabel}</Badge>
            </Row>
            <Row label="External ID">{provider.external_id ?? '—'}</Row>
            <Row label="Source">{provider.source ?? '—'}</Row>
            <Row label="Active">{provider.active ? 'Yes' : 'No'}</Row>
            <Row label="Address">{provider.address ?? '—'}</Row>
            <Row label="Phone">{provider.phone ?? '—'}</Row>
            <Row label="Email">{provider.email ?? '—'}</Row>
            <Row label="Coordinates">
              {provider.latitude != null && provider.longitude != null
                ? `${provider.latitude}, ${provider.longitude}`
                : '—'}
            </Row>
            <Row label="Last ingested">{provider.last_ingested_at ?? '—'}</Row>
            <Row label="Attributes">
              <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 text-xs">
                {JSON.stringify(provider.attributes ?? {}, null, 2)}
              </pre>
            </Row>
            <Row label="FHIR resources">
              {fhirBundle.total > 0 ? (
                <span className="text-muted">
                  {fhirBundle.entry.map((item) => item.resource.resourceType).join(', ')} — use{' '}
                  <strong className="font-medium text-foreground">View FHIR</strong> above
                </span>
              ) : (
                <span className="text-muted">
                  No catalog `resource` JSON found for this pin yet. Re-ingest Organization /
                  Location / HealthcareService workbooks.
                </span>
              )}
            </Row>
          </dl>

          {canEdit ? (
            <div className="mt-6">
              <ArchiveProviderButton providerId={provider.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
