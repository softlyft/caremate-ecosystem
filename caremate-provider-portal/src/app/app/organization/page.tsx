import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { getOrganizationProfile } from '@/domains/org/repository';
import {
  getCatalogSummaryForOrganization,
  listLocationsForOrganizationPage,
} from '@/domains/catalog/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { OrgProfileForm } from '@/components/features/org-profile-form';
import { canManageOrg } from '@/constants/roles';
import { ORG_TYPE_LABELS } from '@/constants/org-types';
import { PageHeader, PageShell } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireModule('organization');
  const session = await requireProviderSession();
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const data = await getOrganizationProfile(session.activeOrganizationId);
  const [locations, catalog] = await Promise.all([
    listLocationsForOrganizationPage(session.activeOrganizationId, { page }),
    getCatalogSummaryForOrganization(session.activeOrganizationId),
  ]);
  const canManage = canManageOrg(session.activeRole);
  const primary = catalog.primaryLocation;

  const hrefForPage = (p: number) => hrefWithPage('/app/organization', p);

  const verification = data?.profile?.verification_status ?? 'pending';

  return (
    <PageShell>
      <PageHeader
        title="Organization"
        description={data?.organization.name}
        actions={
          <>
            <Badge
              variant={
                verification === 'verified'
                  ? 'success'
                  : verification === 'suspended'
                    ? 'danger'
                    : 'warning'
              }
            >
              {verification}
            </Badge>
            {data?.profile?.organization_type ? (
              <Badge variant="secondary">
                {ORG_TYPE_LABELS[data.profile.organization_type]}
              </Badge>
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Catalog contact &amp; services</CardTitle>
            <CardDescription>
              Live from locations and healthcare services (ingest, portal, or CareMate admin)
            </CardDescription>
          </div>
          {canManage && primary ? (
            <TextLink href={`/app/organization/locations/${primary.id}`}>
              Edit primary location
            </TextLink>
          ) : null}
          {canManage && !primary ? (
            <TextLink href="/app/organization/locations/new">Add location</TextLink>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {primary ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Primary location" value={primary.name} />
              <Item label="Status" value={primary.status} />
              <Item label="Phone" value={primary.phone} />
              <Item label="Claim contact email" value={catalog.contactEmail ?? primary.email} />
              <Item label="Address" value={primary.address} />
            </dl>
          ) : (
            <p className="text-sm text-muted">
              No locations yet.
              {canManage
                ? ' Add a location so Nearby and this summary have operational contact details.'
                : ''}
            </p>
          )}

          <div>
            <p className="mb-2 text-sm text-muted">Healthcare services</p>
            {catalog.services.length === 0 ? (
              <p className="text-sm text-muted">
                No catalog services yet.
                {canManage && primary ? ' Add services on a location to list them here.' : ''}
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {catalog.services.map((svc) => (
                  <li key={svc.id} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{svc.name}</span>
                    {svc.service_type ? (
                      <span className="text-muted">
                        {ORG_TYPE_LABELS[svc.service_type as keyof typeof ORG_TYPE_LABELS] ??
                          svc.service_type}
                      </span>
                    ) : null}
                    {canManage && svc.location_id ? (
                      <TextLink
                        href={`/app/organization/locations/${svc.location_id}/services/${svc.id}`}
                      >
                        Edit
                      </TextLink>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portal profile</CardTitle>
          <CardDescription>
            {canManage
              ? 'Engagement fields for this portal — verification and marketing details'
              : 'View-only — owner or administrator can edit'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <OrgProfileForm
              profile={data?.profile ?? null}
              organizationName={data?.organization.name ?? session.activeOrganizationName}
              contactEmail={catalog.contactEmail}
            />
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Claim contact email" value={catalog.contactEmail} />
              <Item label="Website" value={data?.profile?.website} />
              <Item label="Emergency contact" value={data?.profile?.emergency_contact} />
              <Item label="Description" value={data?.profile?.description} />
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Sites under this organization (same catalog as CareMate Nearby / ingest)
            </CardDescription>
          </div>
          {canManage ? (
            <ButtonLink href="/app/organization/locations/new" size="sm">
              Add location
            </ButtonLink>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-28">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted">
                    No locations yet.
                    {canManage ? ' Add a site to offer healthcare services and appear on Nearby.' : ''}
                  </TableCell>
                </TableRow>
              ) : (
                locations.rows.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>
                      <Badge variant={loc.status === 'active' ? 'success' : 'secondary'}>
                        {loc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted">
                      {loc.address ?? '—'}
                    </TableCell>
                    <TableCell>
                      <TextLink href={`/app/organization/locations/${loc.id}`}>Manage</TextLink>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={locations} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </PageShell>
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
