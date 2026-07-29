import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { ORG_TYPE_LABELS } from '@/constants/org-types';
import {
  getLocationForOrganization,
  listServicesForLocationPage,
} from '@/domains/catalog/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { LocationForm } from '@/components/features/location-form';
import { SoftDeleteLocationButton } from '@/components/features/catalog-delete-buttons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProviderOrgType } from '@/types/database';

export default async function LocationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const session = await requireProviderSession();
  const canManage = canManageOrg(session.activeRole);
  const location = await getLocationForOrganization(session.activeOrganizationId, id);
  if (!location) notFound();

  const services = await listServicesForLocationPage(session.activeOrganizationId, id, { page });

  const hrefForPage = (p: number) =>
    hrefWithPage(`/app/organization/locations/${id}`, p);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/organization" className="text-sm text-primary hover:underline">
          ← Organization
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{location.name}</h1>
          <Badge variant={location.status === 'active' ? 'success' : 'secondary'}>
            {location.status}
          </Badge>
        </div>
        <p className="mt-1 font-mono text-xs text-muted">{location.id}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Location details</CardTitle>
            <CardDescription>
              {canManage ? 'Update this site in the shared provider catalog' : 'View-only'}
            </CardDescription>
          </div>
          {canManage ? <SoftDeleteLocationButton locationId={location.id} /> : null}
        </CardHeader>
        <CardContent>
          {canManage ? (
            <LocationForm mode="edit" location={location} />
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Address" value={location.address} />
              <Item label="Phone" value={location.phone} />
              <Item label="Email" value={location.email} />
              <Item
                label="Coordinates"
                value={
                  location.latitude != null && location.longitude != null
                    ? `${location.latitude}, ${location.longitude}`
                    : null
                }
              />
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Healthcare services</CardTitle>
            <CardDescription>
              Services offered at this location (provider_healthcare_services)
            </CardDescription>
          </div>
          {canManage ? (
            <Link
              href={`/app/organization/locations/${location.id}/services/new`}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-white hover:bg-primary-dark"
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
                        ? (ORG_TYPE_LABELS[svc.service_type as ProviderOrgType] ??
                          svc.service_type)
                        : '—'}
                    </TableCell>
                    <TableCell>{svc.active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Link
                        href={`/app/organization/locations/${location.id}/services/${svc.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {canManage ? 'Edit' : 'View'}
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

function Item({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}
