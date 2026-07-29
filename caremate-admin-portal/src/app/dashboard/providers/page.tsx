import Link from 'next/link';
import {
  listProviderHealthcareServices,
  listProviderLocations,
  listProviderOrganizations,
  listProviders,
} from '@/domains/providers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PROVIDER_TYPES, PROVIDER_TYPE_LABELS } from '@/constants/content';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  Provider,
  ProviderHealthcareService,
  ProviderLocation,
  ProviderOrganization,
} from '@/types/database';

const VIEWS = [
  { id: 'organizations', label: 'Organizations' },
  { id: 'locations', label: 'Locations' },
  { id: 'services', label: 'Healthcare services' },
  { id: 'pins', label: 'Nearby pins' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

function isView(value: string | undefined): value is ViewId {
  return VIEWS.some((v) => v.id === value);
}

function providersHref(opts: {
  view: ViewId;
  q?: string;
  type?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  params.set('view', opts.view);
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.view === 'pins' && opts.type) params.set('type', opts.type);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  return `/dashboard/providers?${params.toString()}`;
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; view?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, type, view: viewParam, page: pageParam } = await searchParams;
  const view: ViewId = isView(viewParam) ? viewParam : 'organizations';
  const page = parsePage(pageParam);

  let organizations: PaginatedResult<ProviderOrganization> = emptyPage(page);
  let locations: PaginatedResult<ProviderLocation> = emptyPage(page);
  let services: PaginatedResult<ProviderHealthcareService> = emptyPage(page);
  let providers: PaginatedResult<Provider> = emptyPage(page);

  try {
    if (view === 'organizations') {
      organizations = await listProviderOrganizations({ search: q, page });
    } else if (view === 'locations') {
      locations = await listProviderLocations({ search: q, page });
    } else if (view === 'services') {
      services = await listProviderHealthcareServices({ search: q, page });
    } else {
      providers = await listProviders({ search: q, type: type || undefined, page });
    }
  } catch {
    organizations = emptyPage(page);
    locations = emptyPage(page);
    services = emptyPage(page);
    providers = emptyPage(page);
  }

  const activeResult =
    view === 'organizations'
      ? organizations
      : view === 'locations'
        ? locations
        : view === 'services'
          ? services
          : providers;

  const hrefForPage = (nextPage: number) =>
    providersHref({ view, q, type, page: nextPage });

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Catalog tables hold Postgres UUIDs. Nearby pins appear after Location ingest (one pin per location)."
        actionHref={canEdit ? '/dashboard/providers/upload' : undefined}
        actionLabel={canEdit ? 'Upload providers' : undefined}
      />

      <nav className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const active = view === v.id;
          const href = providersHref({ view: v.id, q });
          return (
            <Link
              key={v.id}
              href={href}
              className={
                active
                  ? 'rounded-md bg-primary px-3 py-1.5 text-sm text-white'
                  : 'rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground'
              }
            >
              {v.label}
            </Link>
          );
        })}
      </nav>

      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="view" value={view} />
        <Input name="q" defaultValue={q} placeholder="Search…" className="max-w-xs" />
        {view === 'pins' ? (
          <Select name="type" defaultValue={type ?? ''} className="w-44">
            <option value="">All types</option>
            {PROVIDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROVIDER_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        ) : null}
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <Card>
        <CardContent className="p-0">
          {view === 'organizations' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-24">FHIR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted">
                      No organizations yet. Upload an Organization workbook first.
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.rows.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="max-w-[18rem] font-mono text-xs">
                        <Link
                          href={`/dashboard/providers/organizations/${org.id}`}
                          className="break-all text-primary hover:underline"
                          title={org.id}
                        >
                          {org.id}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/providers/organizations/${org.id}`}
                          className="text-primary hover:underline"
                        >
                          {org.name}
                        </Link>
                      </TableCell>
                      <TableCell>{org.active ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-muted">{org.source ?? '—'}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/providers/organizations/${org.id}?fhir=1`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : null}

          {view === 'locations' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization ID</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">FHIR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted">
                      No locations yet. Paste Organization UUIDs into managingOrganization, then
                      upload Location.
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.rows.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="max-w-[14rem] font-mono text-xs">
                        <Link
                          href={`/dashboard/providers/${loc.id}`}
                          className="break-all text-primary hover:underline"
                          title={loc.id}
                        >
                          {loc.id}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell
                        className="max-w-[14rem] truncate font-mono text-xs text-muted"
                        title={loc.organization_id}
                      >
                        {loc.organization_id}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted">
                        {loc.address ?? '—'}
                      </TableCell>
                      <TableCell>{loc.status}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/providers/${loc.id}?fhir=1`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : null}

          {view === 'services' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location ID</TableHead>
                  <TableHead>Organization ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-24">FHIR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted">
                      No healthcare services yet. Paste Location UUIDs into location, then upload.
                    </TableCell>
                  </TableRow>
                ) : (
                  services.rows.map((hs) => (
                    <TableRow key={hs.id}>
                      <TableCell className="max-w-[14rem] break-all font-mono text-xs">
                        <Link
                          href={`/dashboard/providers/services/${hs.id}`}
                          className="text-primary hover:underline"
                        >
                          {hs.id}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/providers/services/${hs.id}`}
                          className="text-primary hover:underline"
                        >
                          {hs.name}
                        </Link>
                      </TableCell>
                      <TableCell
                        className="max-w-[14rem] truncate font-mono text-xs text-muted"
                        title={hs.location_id ?? undefined}
                      >
                        {hs.location_id ?? '—'}
                      </TableCell>
                      <TableCell
                        className="max-w-[14rem] truncate font-mono text-xs text-muted"
                        title={hs.organization_id}
                      >
                        {hs.organization_id}
                      </TableCell>
                      <TableCell className="text-muted">{hs.service_type ?? '—'}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/providers/services/${hs.id}?fhir=1`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : null}

          {view === 'pins' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Organization ID</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-24">FHIR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted">
                      No Nearby pins yet. Pins are created when Locations are ingested.
                    </TableCell>
                  </TableRow>
                ) : (
                  providers.rows.map((p) => {
                    const serviceCount = Array.isArray(p.healthcare_service_ids)
                      ? p.healthcare_service_ids.length
                      : 0;
                    const locationId = p.location_id ?? p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                          <Link
                            href={`/dashboard/providers/${p.id}`}
                            className="text-primary hover:underline"
                            title={locationId}
                          >
                            {locationId}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/providers/${p.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {p.name}
                          </Link>
                          {!p.active ? (
                            <Badge variant="secondary" className="ml-2">
                              Inactive
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {PROVIDER_TYPE_LABELS[p.type as keyof typeof PROVIDER_TYPE_LABELS] ??
                            p.type}
                        </TableCell>
                        <TableCell
                          className="max-w-[12rem] truncate font-mono text-xs text-muted"
                          title={p.organization_id ?? undefined}
                        >
                          {p.organization_id ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted">{serviceCount}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted">
                          {p.address ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/providers/${p.id}?fhir=1`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ) : null}

          <PaginationBar result={activeResult} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
