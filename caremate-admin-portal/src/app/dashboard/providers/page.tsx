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
import { FilterBar } from '@/components/filter-bar';
import { TabNav } from '@/components/tab-nav';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TextLink } from '@/components/ui/text-link';
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
        description="Browse organizations → locations → healthcare services. Flat tabs are shortcuts into the same catalog."
      >
        {canEdit ? (
          <>
            <ButtonLink href="/dashboard/providers/organizations/new">Create organization</ButtonLink>
            <ButtonLink href="/dashboard/providers/upload" variant="secondary">
              Upload workbook
            </ButtonLink>
          </>
        ) : null}
      </PageHeader>

      <TabNav
        tabs={VIEWS.map((v) => ({
          key: v.id,
          label: v.label,
          href: providersHref({ view: v.id, q }),
        }))}
        current={view}
        ariaLabel="Catalog view"
        variant="pill"
      />

      <FilterBar>
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
      </FilterBar>

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
                      No organizations yet. Create one or upload an Organization workbook.
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.rows.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="max-w-[18rem] font-mono text-xs">
                        <TextLink
                          href={`/dashboard/providers/organizations/${org.id}`}
                          className="break-all"
                          title={org.id}
                        >
                          {org.id}
                        </TextLink>
                      </TableCell>
                      <TableCell className="font-medium">
                        <TextLink href={`/dashboard/providers/organizations/${org.id}`}>
                          {org.name}
                        </TextLink>
                      </TableCell>
                      <TableCell>{org.active ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-muted">{org.source ?? '—'}</TableCell>
                      <TableCell>
                        <TextLink href={`/dashboard/providers/organizations/${org.id}?fhir=1`}>
                          View
                        </TextLink>
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
                  locations.rows.map((loc) => {
                    const catalogHref = `/dashboard/providers/organizations/${loc.organization_id}/locations/${loc.id}`;
                    return (
                    <TableRow key={loc.id}>
                      <TableCell className="max-w-[14rem] font-mono text-xs">
                        <TextLink href={catalogHref} className="break-all" title={loc.id}>
                          {loc.id}
                        </TextLink>
                      </TableCell>
                      <TableCell className="font-medium">
                        <TextLink href={catalogHref}>{loc.name}</TextLink>
                      </TableCell>
                      <TableCell
                        className="max-w-[14rem] truncate font-mono text-xs text-muted"
                        title={loc.organization_id}
                      >
                        <TextLink href={`/dashboard/providers/organizations/${loc.organization_id}`}>
                          {loc.organization_id}
                        </TextLink>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted">
                        {loc.address ?? '—'}
                      </TableCell>
                      <TableCell>{loc.status}</TableCell>
                      <TableCell>
                        <TextLink href={`${catalogHref}?fhir=1`}>View</TextLink>
                      </TableCell>
                    </TableRow>
                    );
                  })
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
                  services.rows.map((hs) => {
                    const catalogHref =
                      hs.location_id != null
                        ? `/dashboard/providers/organizations/${hs.organization_id}/locations/${hs.location_id}/services/${hs.id}`
                        : `/dashboard/providers/organizations/${hs.organization_id}`;
                    return (
                    <TableRow key={hs.id}>
                      <TableCell className="max-w-[14rem] break-all font-mono text-xs">
                        <TextLink href={catalogHref}>{hs.id}</TextLink>
                      </TableCell>
                      <TableCell className="font-medium">
                        <TextLink href={catalogHref}>{hs.name}</TextLink>
                      </TableCell>
                      <TableCell
                        className="max-w-[14rem] truncate font-mono text-xs text-muted"
                        title={hs.location_id ?? undefined}
                      >
                        {hs.location_id && hs.organization_id ? (
                          <TextLink
                            href={`/dashboard/providers/organizations/${hs.organization_id}/locations/${hs.location_id}`}
                          >
                            {hs.location_id}
                          </TextLink>
                        ) : (
                          (hs.location_id ?? '—')
                        )}
                      </TableCell>
                      <TableCell
                        className="max-w-[14rem] truncate font-mono text-xs text-muted"
                        title={hs.organization_id}
                      >
                        <TextLink href={`/dashboard/providers/organizations/${hs.organization_id}`}>
                          {hs.organization_id}
                        </TextLink>
                      </TableCell>
                      <TableCell className="text-muted">{hs.service_type ?? '—'}</TableCell>
                      <TableCell>
                        <TextLink href={`${catalogHref}?fhir=1`}>View</TextLink>
                      </TableCell>
                    </TableRow>
                    );
                  })
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
                          <TextLink
                            href={`/dashboard/providers/${p.id}`}
                            title={locationId}
                          >
                            {locationId}
                          </TextLink>
                        </TableCell>
                        <TableCell>
                          <TextLink href={`/dashboard/providers/${p.id}`}>{p.name}</TextLink>
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
                          <TextLink href={`/dashboard/providers/${p.id}?fhir=1`}>View</TextLink>
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
