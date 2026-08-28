import { ButtonLink } from '@/components/ui/button-link';
import { TextLink } from '@/components/ui/text-link';
import { notFound } from 'next/navigation';

import { emptyFhirBundle } from '@/domains/providers/fhir-bundle';
import {
  getLocationFhirBundle,
  getProvider,
  getProviderLocation,
  getProviderOrganization,
  listServicesForLocationPage,
} from '@/domains/providers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PROVIDER_TYPE_LABELS, type ProviderType } from '@/constants/content';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProviderFhirViewButton } from '@/features/providers/provider-fhir-view-button';
import { LocationForm } from '@/features/providers/location-form';
import { ArchiveLocationButton } from '@/features/providers/catalog-archive-buttons';
import type { ProviderHealthcareService } from '@/types/database';
import { DescriptionRow } from '@/components/ui/detail-row';

export default async function LocationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locationId: string }>;
  searchParams: Promise<{ fhir?: string; page?: string }>;
}) {
  const { id: organizationId, locationId } = await params;
  const { fhir, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);

  const organization = await getProviderOrganization(organizationId);
  if (!organization || organization.deleted_at) notFound();

  const location = await getProviderLocation(locationId);
  if (!location || location.deleted_at || location.organization_id !== organizationId) {
    notFound();
  }

  let fhirBundle;
  try {
    fhirBundle = await getLocationFhirBundle(location);
  } catch {
    fhirBundle = emptyFhirBundle();
  }

  let services: PaginatedResult<ProviderHealthcareService> = emptyPage(page);
  try {
    services = await listServicesForLocationPage(locationId, { page });
  } catch {
    services = emptyPage(page);
  }
  const pin = await getProvider(locationId).catch(() => null);

  const hrefForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (fhir === '1' || fhir === 'true') params.set('fhir', '1');
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return `/dashboard/providers/organizations/${organizationId}/locations/${locationId}${qs ? `?${qs}` : ''}`;
  };

  const bundleJson = JSON.stringify(fhirBundle, null, 2);
  const openFhir = fhir === '1' || fhir === 'true';

  return (
    <div className="space-y-6">
      <PageHeader
        title={location.name}
        description={`Location under ${organization.name}`}
      >
        <ProviderFhirViewButton
          subjectName={location.name}
          subtitle={`Location resource for ${location.name}`}
          bundleJson={bundleJson}
          resourceCount={fhirBundle.total}
          initialOpen={openFhir}
        />
        {canEdit ? (
          <ArchiveLocationButton locationId={location.id} organizationId={organizationId} />
        ) : null}
        <TextLink
          href={`/dashboard/providers/organizations/${organizationId}`}
          className="text-muted hover:text-foreground"
        >
          Back to organization
        </TextLink>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Location details</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <LocationForm
              mode="edit"
              organizationId={organizationId}
              location={location}
              contactEmail={location.email}
            />
          ) : (
            <dl>
              <DescriptionRow label="Address">{location.address ?? '—'}</DescriptionRow>
              <DescriptionRow label="Phone">{location.phone ?? '—'}</DescriptionRow>
              <DescriptionRow label="Email">{location.email ?? '—'}</DescriptionRow>
              <DescriptionRow label="Status">{location.status}</DescriptionRow>
            </dl>
          )}
          <dl className="mt-6 border-t border-border pt-4">
            <DescriptionRow label="Location ID">
              <code className="break-all text-xs">{location.id}</code>
            </DescriptionRow>
            <DescriptionRow label="Source">{location.source ?? '—'}</DescriptionRow>
            <DescriptionRow label="Nearby pin">
              {pin ? (
                <TextLink href={`/dashboard/providers/${pin.id}`}>View projection</TextLink>
              ) : (
                '—'
              )}
            </DescriptionRow>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Healthcare services</CardTitle>
          {canEdit ? (
            <ButtonLink
              href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}/services/new`}
              size="sm"
            >
              Add service
            </ButtonLink>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-28">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted">
                    No healthcare services at this location yet.
                  </TableCell>
                </TableRow>
              ) : (
                services.rows.map((svc) => (
                  <TableRow key={svc.id}>
                    <TableCell className="font-medium">{svc.name}</TableCell>
                    <TableCell className="text-muted">
                      {svc.service_type
                        ? (PROVIDER_TYPE_LABELS[svc.service_type as ProviderType] ??
                          svc.service_type)
                        : '—'}
                    </TableCell>
                    <TableCell>{svc.active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <TextLink
                        href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}/services/${svc.id}`}
                      >
                        {canEdit ? 'Edit' : 'View'}
                      </TextLink>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={services} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
