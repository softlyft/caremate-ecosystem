import { redirect } from 'next/navigation';
import { getProviderHealthcareService } from '@/domains/providers/repository';

/** Flat service URL → nested catalog route when org + location are known. */
export default async function HealthcareServiceRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fhir?: string }>;
}) {
  const { id } = await params;
  const { fhir } = await searchParams;
  const service = await getProviderHealthcareService(id).catch(() => null);

  if (service && !service.deleted_at && service.location_id) {
    const qs = fhir === '1' || fhir === 'true' ? '?fhir=1' : '';
    redirect(
      `/dashboard/providers/organizations/${service.organization_id}/locations/${service.location_id}/services/${service.id}${qs}`,
    );
  }

  redirect('/dashboard/providers?view=services');
}
