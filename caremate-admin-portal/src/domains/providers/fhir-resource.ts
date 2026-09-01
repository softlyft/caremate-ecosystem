import type { Json } from '@/types/database';
import {
  ORGANIZATION_CATALOG_TYPE_LABELS,
  type OrganizationCatalogType,
} from '@/constants/content';

const PROVIDER_TYPE_SYSTEM = 'https://getcaremate.com/fhir/CodeSystem/provider-type';

export function organizationReference(orgId: string): Json {
  return { reference: `Organization/${orgId}` };
}

export function locationReference(locationId: string): Json {
  return { reference: `Location/${locationId}` };
}

export function buildOrganizationResource(input: {
  id: string;
  name: string;
  active: boolean;
  type?: OrganizationCatalogType | null;
}): Json {
  const resource: Record<string, unknown> = {
    resourceType: 'Organization',
    id: input.id,
    active: input.active,
    name: input.name,
  };
  if (input.type) {
    const label = ORGANIZATION_CATALOG_TYPE_LABELS[input.type];
    resource.type = [
      {
        coding: [{ system: PROVIDER_TYPE_SYSTEM, code: input.type, display: label }],
        text: label,
      },
    ];
  }
  return resource;
}

export function buildLocationResource(input: {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Json {
  const telecom: Json[] = [];
  if (input.phone?.trim()) {
    telecom.push({ system: 'phone', value: input.phone.trim() });
  }
  if (input.email?.trim()) {
    telecom.push({ system: 'email', value: input.email.trim() });
  }

  const position =
    input.latitude != null && input.longitude != null
      ? { latitude: input.latitude, longitude: input.longitude }
      : null;

  return {
    resourceType: 'Location',
    id: input.id,
    status: input.status || 'active',
    name: input.name,
    mode: 'instance',
    address: input.address?.trim() ? { text: input.address.trim() } : null,
    contact: telecom.length ? [{ telecom }] : null,
    position,
    managingOrganization: organizationReference(input.organizationId),
  };
}

export function buildHealthcareServiceResource(input: {
  id: string;
  organizationId: string;
  locationId: string;
  name: string;
  active: boolean;
  serviceType?: string | null;
}): Json {
  return {
    resourceType: 'HealthcareService',
    id: input.id,
    active: input.active,
    name: input.name,
    providedBy: organizationReference(input.organizationId),
    location: [locationReference(input.locationId)],
    type: input.serviceType?.trim()
      ? [
          {
            coding: [
              {
                system: 'https://caremate.com/coding-system',
                code: input.serviceType.trim(),
                display: input.serviceType.trim(),
              },
            ],
            text: input.serviceType.trim(),
          },
        ]
      : null,
  };
}
