import type { Json } from '@caremate/db-types';

export type FhirResource = Record<string, unknown> & {
  resourceType?: string;
  id?: string;
};

export type ProviderFhirBundle = {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  total: number;
  entry: Array<{
    fullUrl: string;
    resource: FhirResource;
  }>;
};

function asFhirResource(value: Json | null | undefined): FhirResource | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as FhirResource;
}

function entryFullUrl(resource: FhirResource, fallbackType: string, fallbackId: string): string {
  const type = typeof resource.resourceType === 'string' ? resource.resourceType : fallbackType;
  const id = typeof resource.id === 'string' && resource.id.length > 0 ? resource.id : fallbackId;
  return `${type}/${id}`;
}

export function emptyFhirBundle(): ProviderFhirBundle {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: 0,
    entry: [],
  };
}

/** Assemble a read-only FHIR Bundle from stored catalog `resource` columns. */
export function buildProviderFhirBundle(input: {
  organizationId?: string | null;
  organizationResource?: Json | null;
  locationId?: string | null;
  locationResource?: Json | null;
  healthcareServices?: Array<{ id: string; resource: Json | null }>;
}): ProviderFhirBundle {
  const entry: ProviderFhirBundle['entry'] = [];

  const organization = asFhirResource(input.organizationResource);
  if (organization && input.organizationId) {
    entry.push({
      fullUrl: entryFullUrl(organization, 'Organization', input.organizationId),
      resource: {
        ...organization,
        id: organization.id ?? input.organizationId,
        resourceType: organization.resourceType ?? 'Organization',
      },
    });
  }

  const location = asFhirResource(input.locationResource);
  if (location && input.locationId) {
    entry.push({
      fullUrl: entryFullUrl(location, 'Location', input.locationId),
      resource: {
        ...location,
        id: location.id ?? input.locationId,
        resourceType: location.resourceType ?? 'Location',
      },
    });
  }

  for (const service of input.healthcareServices ?? []) {
    const resource = asFhirResource(service.resource);
    if (!resource) continue;
    entry.push({
      fullUrl: entryFullUrl(resource, 'HealthcareService', service.id),
      resource: {
        ...resource,
        id: resource.id ?? service.id,
        resourceType: resource.resourceType ?? 'HealthcareService',
      },
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entry.length,
    entry,
  };
}
