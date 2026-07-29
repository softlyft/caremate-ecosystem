import Link from 'next/link';
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

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
        <Link
          href={`/dashboard/providers/organizations/${organizationId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          Back to organization
        </Link>
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
              <Row label="Address">{location.address ?? '—'}</Row>
              <Row label="Phone">{location.phone ?? '—'}</Row>
              <Row label="Email">{location.email ?? '—'}</Row>
              <Row label="Status">{location.status}</Row>
            </dl>
          )}
          <dl className="mt-6 border-t border-border pt-4">
            <Row label="Location ID">
              <code className="break-all text-xs">{location.id}</code>
            </Row>
            <Row label="Source">{location.source ?? '—'}</Row>
            <Row label="Nearby pin">
              {pin ? (
                <Link
                  href={`/dashboard/providers/${pin.id}`}
                  className="text-primary hover:underline"
                >
                  View projection
                </Link>
              ) : (
                '—'
              )}
            </Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Healthcare services</CardTitle>
          {canEdit ? (
            <Link
              href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}/services/new`}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-white hover:opacity-90"
            >
              Add service
            </Link>
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
                      <Link
                        href={`/dashboard/providers/organizations/${organizationId}/locations/${locationId}/services/${svc.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {canEdit ? 'Edit' : 'View'}
                      </Link>
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
