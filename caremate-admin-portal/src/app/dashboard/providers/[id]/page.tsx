import { notFound } from 'next/navigation';
import { getProvider, getProviderFhirBundle } from '@/domains/providers/repository';
import { emptyFhirBundle } from '@/domains/providers/fhir-bundle';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PROVIDER_TYPE_LABELS } from '@/constants/content';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DescriptionRow } from '@/components/ui/detail-row';
import { TextLink } from '@/components/ui/text-link';
import { ArchiveProviderButton } from '@/features/providers/archive-provider-button';
import { ProviderFhirViewButton } from '@/features/providers/provider-fhir-view-button';

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
        <TextLink href="/dashboard/providers" className="text-muted hover:text-foreground">
          Back to list
        </TextLink>
      </PageHeader>

      <Card>
        <CardContent className="p-6">
          <dl>
            <DescriptionRow label="Location ID (PK)">
              <code className="break-all text-xs">{provider.location_id ?? provider.id}</code>
            </DescriptionRow>
            <DescriptionRow label="Organization ID">
              <code className="break-all text-xs">{provider.organization_id ?? '—'}</code>
            </DescriptionRow>
            <DescriptionRow label="Healthcare service IDs">
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
            </DescriptionRow>
            <DescriptionRow label="Type">
              <Badge variant="secondary">{typeLabel}</Badge>
            </DescriptionRow>
            <DescriptionRow label="External ID">{provider.external_id ?? '—'}</DescriptionRow>
            <DescriptionRow label="Source">{provider.source ?? '—'}</DescriptionRow>
            <DescriptionRow label="Active">{provider.active ? 'Yes' : 'No'}</DescriptionRow>
            <DescriptionRow label="Address">{provider.address ?? '—'}</DescriptionRow>
            <DescriptionRow label="Phone">{provider.phone ?? '—'}</DescriptionRow>
            <DescriptionRow label="Email">{provider.email ?? '—'}</DescriptionRow>
            <DescriptionRow label="Coordinates">
              {provider.latitude != null && provider.longitude != null
                ? `${provider.latitude}, ${provider.longitude}`
                : '—'}
            </DescriptionRow>
            <DescriptionRow label="Last ingested">{provider.last_ingested_at ?? '—'}</DescriptionRow>
            <DescriptionRow label="Attributes">
              <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 text-xs">
                {JSON.stringify(provider.attributes ?? {}, null, 2)}
              </pre>
            </DescriptionRow>
            <DescriptionRow label="FHIR resources">
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
            </DescriptionRow>
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
