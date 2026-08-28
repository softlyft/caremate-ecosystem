import { notFound } from 'next/navigation';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { ORG_TYPE_LABELS } from '@/constants/org-types';
import {
  getLocationForOrganization,
  getServiceForOrganization,
} from '@/domains/catalog/repository';
import { HealthcareServiceForm } from '@/components/features/healthcare-service-form';
import { SoftDeleteServiceButton } from '@/components/features/catalog-delete-buttons';
import { PageHeader, PageShell } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import type { ProviderOrgType } from '@/types/database';

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string; serviceId: string }>;
}) {
  const { id: locationId, serviceId } = await params;
  const session = await requireProviderSession();
  const canManage = canManageOrg(session.activeRole);
  const location = await getLocationForOrganization(session.activeOrganizationId, locationId);
  if (!location) notFound();

  const service = await getServiceForOrganization(session.activeOrganizationId, serviceId);
  if (!service || service.location_id !== locationId) notFound();

  return (
    <PageShell className="mx-auto max-w-2xl">
      <TextLink href={`/app/organization/locations/${locationId}`}>← {location.name}</TextLink>
      <PageHeader title={service.name} />
      <p className="-mt-4 font-mono text-xs text-muted">{service.id}</p>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Healthcare service</CardTitle>
            <CardDescription>
              {canManage ? 'Update this catalog service' : 'View-only'}
            </CardDescription>
          </div>
          {canManage ? <SoftDeleteServiceButton serviceId={service.id} /> : null}
        </CardHeader>
        <CardContent>
          {canManage ? (
            <HealthcareServiceForm mode="edit" locationId={locationId} service={service} />
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Type</dt>
                <dd className="font-medium">
                  {service.service_type
                    ? (ORG_TYPE_LABELS[service.service_type as ProviderOrgType] ??
                      service.service_type)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Active</dt>
                <dd className="font-medium">{service.active ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
