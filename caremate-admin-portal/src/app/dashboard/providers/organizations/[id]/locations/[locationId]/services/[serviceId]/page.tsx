import { notFound } from 'next/navigation';

import { emptyFhirBundle } from '@/domains/providers/fhir-bundle';
import {
  getHealthcareServiceFhirBundle,
  getProviderHealthcareService,
  getProviderLocation,
  getProviderOrganization,
} from '@/domains/providers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DescriptionRow } from '@/components/ui/detail-row';
import { TextLink } from '@/components/ui/text-link';
import { ProviderFhirViewButton } from '@/features/providers/provider-fhir-view-button';
import { HealthcareServiceForm } from '@/features/providers/healthcare-service-form';
import { ArchiveServiceButton } from '@/features/providers/catalog-archive-buttons';

export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locationId: string; serviceId: string }>;
  searchParams: Promise<{ fhir?: string }>;
}) {
  const { id: organizationId, locationId, serviceId } = await params;
  const { fhir } = await searchParams;
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);

  const organization = await getProviderOrganization(organizationId);
  if (!organization || organization.deleted_at) notFound();

  const location = await getProviderLocation(locationId);
  if (!location || location.deleted_at || location.organization_id !== organizationId) {
    notFound();
  }

  const service = await getProviderHealthcareService(serviceId);
  if (
    !service ||
    service.deleted_at ||
    service.organization_id !== organizationId ||
    service.location_id !== locationId
  ) {
    notFound();
  }

  let fhirBundle;
  try {
    fhirBundle = await getHealthcareServiceFhirBundle(service);
  } catch {
    fhirBundle = emptyFhirBundle();
  }

  const bundleJson = JSON.stringify(fhirBundle, null, 2);
  const openFhir = fhir === '1' || fhir === 'true';

  return (
    <div className="space-y-6">
      <PageHeader title={service.name} description={`Service at ${location.name}`}>
        <ProviderFhirViewButton
          subjectName={service.name}
          subtitle={`HealthcareService resource for ${service.name}`}
          bundleJson={bundleJson}
          resourceCount={fhirBundle.total}
          initialOpen={openFhir}
        />
        {canEdit ? (
          <ArchiveServiceButton
            serviceId={service.id}
            organizationId={organizationId}
            locationId={locationId}
          />
        ) : null}
        <TextLink
          href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}`}
          className="text-muted hover:text-foreground"
        >
          Back to location
        </TextLink>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Healthcare service</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <HealthcareServiceForm
              mode="edit"
              organizationId={organizationId}
              locationId={locationId}
              service={service}
            />
          ) : (
            <dl>
              <DescriptionRow label="Type">{service.service_type ?? '—'}</DescriptionRow>
              <DescriptionRow label="Active">{service.active ? 'Yes' : 'No'}</DescriptionRow>
            </dl>
          )}
          <dl className="mt-6 border-t border-border pt-4">
            <DescriptionRow label="Service ID">
              <code className="break-all text-xs">{service.id}</code>
            </DescriptionRow>
            <DescriptionRow label="Source">{service.source ?? '—'}</DescriptionRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
