import { ButtonLink } from '@/components/ui/button-link';
import { TextLink } from '@/components/ui/text-link';
import { notFound } from 'next/navigation';

import { emptyFhirBundle } from '@/domains/providers/fhir-bundle';
import {
  getOrganizationContactEmail,
  getOrganizationFhirBundle,
  getProviderOrganization,
  getProviderProfile,
  isOrgVerified,
  listLocationsForOrganizationPage,
} from '@/domains/providers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog, canManageBilling } from '@/constants/roles';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
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
import { OrganizationForm } from '@/features/providers/organization-form';
import { OrganizationContactEmailForm } from '@/features/providers/organization-contact-email-form';
import { ArchiveOrganizationButton } from '@/features/providers/catalog-archive-buttons';
import type { ProviderLocation } from '@/types/database';
import { DescriptionRow } from '@/components/ui/detail-row';
import { ProviderOrgPlanActivationSection } from '@/features/provider-plans/provider-org-plan-activation-section';

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fhir?: string; page?: string }>;
}) {
  const { id } = await params;
  const { fhir, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const canActivatePlan = canManageBilling(session?.role);

  let organization;
  try {
    organization = await getProviderOrganization(id);
  } catch {
    organization = null;
  }
  if (!organization || organization.deleted_at) notFound();

  let fhirBundle;
  try {
    fhirBundle = await getOrganizationFhirBundle(organization);
  } catch {
    fhirBundle = emptyFhirBundle();
  }

  let locations: PaginatedResult<ProviderLocation> = emptyPage(page);
  try {
    locations = await listLocationsForOrganizationPage(organization.id, { page });
  } catch {
    locations = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (fhir === '1' || fhir === 'true') params.set('fhir', '1');
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return `/dashboard/providers/organizations/${organization.id}${qs ? `?${qs}` : ''}`;
  };

  const profile = await getProviderProfile(organization.id).catch(() => null);
  const contactEmail =
    (await getOrganizationContactEmail(organization.id).catch(() => null)) ?? null;
  const verified = isOrgVerified(profile);

  const bundleJson = JSON.stringify(fhirBundle, null, 2);
  const openFhir = fhir === '1' || fhir === 'true';

  return (
    <div className="space-y-6">
      <PageHeader
        title={organization.name}
        description="Organization catalog row. Edit details and manage locations."
      >
        <Badge variant={verified ? 'success' : 'warning'}>
          {profile?.verification_status ?? 'pending'}
        </Badge>
        <ProviderFhirViewButton
          subjectName={organization.name}
          subtitle={`Organization resource for ${organization.name}`}
          bundleJson={bundleJson}
          resourceCount={fhirBundle.total}
          initialOpen={openFhir}
        />
        {canEdit ? <ArchiveOrganizationButton organizationId={organization.id} /> : null}
        <TextLink
          href="/dashboard/providers?view=organizations"
          className="text-muted hover:text-foreground"
        >
          Back to list
        </TextLink>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <OrganizationForm mode="edit" organization={organization} />
          ) : (
            <dl>
              <DescriptionRow label="Organization ID">
                <code className="break-all text-xs">{organization.id}</code>
              </DescriptionRow>
              <DescriptionRow label="Active">
                <Badge variant="secondary">{organization.active ? 'Yes' : 'No'}</Badge>
              </DescriptionRow>
              <DescriptionRow label="Source">{organization.source ?? '—'}</DescriptionRow>
              <DescriptionRow label="Last ingested">{organization.last_ingested_at ?? '—'}</DescriptionRow>
            </dl>
          )}
          {canEdit ? (
            <dl className="mt-6 border-t border-border pt-4">
              <DescriptionRow label="Organization ID">
                <code className="break-all text-xs">{organization.id}</code>
              </DescriptionRow>
              <DescriptionRow label="Source">{organization.source ?? '—'}</DescriptionRow>
              <DescriptionRow label="Last ingested">{organization.last_ingested_at ?? '—'}</DescriptionRow>
            </dl>
          ) : null}
          <div className="mt-6 border-t border-border pt-4">
            <OrganizationContactEmailForm
              organizationId={organization.id}
              email={contactEmail}
              verified={verified}
              canEdit={Boolean(canEdit)}
            />
          </div>
        </CardContent>
      </Card>

      {canActivatePlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Care Portal plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ProviderOrgPlanActivationSection organizationId={organization.id} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Locations</CardTitle>
          {canEdit ? (
            <ButtonLink
              href={`/dashboard/providers/organizations/${organization.id}/locations/new`}
              size="sm"
            >
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
                    {canEdit ? ' Add a site to offer healthcare services and Nearby pins.' : ''}
                  </TableCell>
                </TableRow>
              ) : (
                locations.rows.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{loc.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted">
                      {loc.address ?? '—'}
                    </TableCell>
                    <TableCell>
                      <TextLink
                        href={`/dashboard/providers/organizations/${organization.id}/locations/${loc.id}`}
                      >
                        Manage
                      </TextLink>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={locations} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
