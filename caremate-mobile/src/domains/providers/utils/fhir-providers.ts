import providersBundle from '@/domains/providers/data/providers.json';
import { isProviderType, type ProviderType } from '@/domains/providers/types';
import type { Provider } from '@/types';

/** Canonical FHIR namespace host (official product domain). */
const FHIR_BASE = 'https://getcaremate.com';
/** Pre-migration host — still accepted when reading existing provider JSON. */
const LEGACY_FHIR_BASE = 'https://caremate.app';

const PROVIDER_TYPE_SYSTEM = `${FHIR_BASE}/fhir/CodeSystem/provider-type`;
const DISTANCE_KM_EXTENSION = `${FHIR_BASE}/fhir/StructureDefinition/distance-km`;
const ATTRIBUTES_EXTENSION = `${FHIR_BASE}/fhir/StructureDefinition/provider-attributes`;

function matchesFhirUrl(actual: string | undefined, canonical: string): boolean {
  if (!actual) return false;
  if (actual === canonical) return true;
  return actual === canonical.replace(FHIR_BASE, LEGACY_FHIR_BASE);
}

const LEGACY_PROVIDER_IDS = ['provider-1', 'provider-2', 'provider-3', 'provider-4'] as const;

interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

interface FhirContactPoint {
  system?: string;
  value?: string;
  use?: string;
}

interface FhirAddress {
  use?: string;
  type?: string;
  text?: string;
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface FhirExtension {
  url?: string;
  valueDecimal?: number;
  valueString?: string;
}

interface FhirReference {
  reference?: string;
  display?: string;
}

interface FhirOrganization {
  resourceType: 'Organization';
  id?: string;
  active?: boolean;
  name?: string;
  type?: FhirCodeableConcept[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  extension?: FhirExtension[];
}

interface FhirLocation {
  resourceType: 'Location';
  id?: string;
  status?: string;
  name?: string;
  mode?: string;
  type?: FhirCodeableConcept[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
  position?: {
    longitude?: number;
    latitude?: number;
    altitude?: number;
  };
  managingOrganization?: FhirReference;
  extension?: FhirExtension[];
}

type FhirResource = FhirOrganization | FhirLocation | { resourceType: string; id?: string };

interface FhirBundleEntry {
  fullUrl?: string;
  resource?: FhirResource;
}

interface FhirBundle {
  resourceType: 'Bundle';
  type?: string;
  entry?: FhirBundleEntry[];
}

export type ProviderSeed = Omit<Provider, 'syncStatus' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

function telecomValue(telecom: FhirContactPoint[] | undefined, system: string): string | null {
  return telecom?.find((item) => item.system === system)?.value?.trim() || null;
}

function formatAddress(address?: FhirAddress | null): string | null {
  if (!address) {
    return null;
  }
  if (address.text?.trim()) {
    return address.text.trim();
  }

  const parts = [
    ...(address.line ?? []),
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.length > 0 ? parts.join(', ') : null;
}

function resolveProviderType(organization: FhirOrganization): ProviderType {
  for (const concept of organization.type ?? []) {
    for (const coding of concept.coding ?? []) {
      if (
        matchesFhirUrl(coding.system, PROVIDER_TYPE_SYSTEM) &&
        coding.code &&
        isProviderType(coding.code)
      ) {
        return coding.code;
      }
    }
  }

  const text = organization.type?.[0]?.text?.toLowerCase() ?? '';
  if (text.includes('tele') || text.includes('virtual')) return 'telemedicine';
  if (text.includes('dental') || text.includes('dentist')) return 'dentist';
  if (
    text.includes('ophthalm') ||
    text.includes('optometr') ||
    text.includes('optical') ||
    text.includes('eye care') ||
    text.includes('eye ')
  ) {
    return 'eye_care';
  }
  if (
    text.includes('imaging') ||
    text.includes('radiolog') ||
    text.includes('x-ray') ||
    text.includes('xray')
  ) {
    return 'imaging_centre';
  }
  if (text.includes('insurance') || text.includes('hmo')) return 'insurance';
  if (text.includes('home care') || text.includes('home health')) return 'home_care';
  if (text.includes('medical equipment') || text.includes('medical suppl'))
    return 'medical_equipment';
  if (text.includes('government health') || text.includes('ministry of health')) {
    return 'government_health';
  }
  if (text.includes('ngo') || text.includes('non-profit') || text.includes('nonprofit'))
    return 'ngo';
  if (text.includes('mental')) return 'mental_health';
  if (text.includes('ambulance')) return 'ambulance';
  if (text.includes('blood')) return 'blood_bank';
  if (text.includes('pharmac')) return 'pharmacy';
  if (text.includes('lab')) return 'laboratory';
  if (text.includes('hospital')) return 'hospital';
  if (text.includes('clinic')) return 'clinic';

  return 'clinic';
}

function attributesFromOrganization(organization: FhirOrganization): Record<string, unknown> {
  const extension = organization.extension?.find((item) =>
    matchesFhirUrl(item.url, ATTRIBUTES_EXTENSION),
  );
  if (typeof extension?.valueString === 'string' && extension.valueString.trim()) {
    try {
      const parsed = JSON.parse(extension.valueString) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function distanceKmFromLocation(location: FhirLocation): number | null {
  const extension = location.extension?.find((item) =>
    matchesFhirUrl(item.url, DISTANCE_KM_EXTENSION),
  );
  return typeof extension?.valueDecimal === 'number' ? extension.valueDecimal : null;
}

function organizationIdFromReference(reference?: string): string | null {
  if (!reference) {
    return null;
  }
  const match = reference.match(/^Organization\/(.+)$/);
  return match?.[1] ?? null;
}

/** Maps a FHIR R4 provider directory Bundle (Organization + Location) into CareMate providers. */
export function mapFhirProviderBundle(
  bundle: FhirBundle = providersBundle as FhirBundle,
): ProviderSeed[] {
  const organizations = new Map<string, FhirOrganization>();
  const locations: FhirLocation[] = [];

  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource;
    if (!resource?.id) {
      continue;
    }
    if (resource.resourceType === 'Organization') {
      organizations.set(resource.id, resource as FhirOrganization);
    }
    if (resource.resourceType === 'Location') {
      locations.push(resource as FhirLocation);
    }
  }

  const providers: ProviderSeed[] = [];

  for (const location of locations) {
    const organizationId = organizationIdFromReference(location.managingOrganization?.reference);
    const organization = organizationId ? organizations.get(organizationId) : undefined;
    if (!organization?.id || organization.active === false) {
      continue;
    }
    if (!location.id) {
      continue;
    }
    if (location.status && location.status !== 'active') {
      continue;
    }

    const telecom = location.telecom?.length ? location.telecom : organization.telecom;
    const address = formatAddress(location.address) ?? formatAddress(organization.address?.[0]);

    providers.push({
      id: location.id,
      name: organization.name?.trim() || location.name?.trim() || 'Unknown provider',
      type: resolveProviderType(organization),
      address,
      phone: telecomValue(telecom, 'phone'),
      email: telecomValue(telecom, 'email'),
      latitude: location.position?.latitude ?? null,
      longitude: location.position?.longitude ?? null,
      isFavorite: false,
      distanceKm: distanceKmFromLocation(location),
      attributes: {
        ...attributesFromOrganization(organization),
        organization_id: organization.id,
        location_id: location.id,
      },
    });
  }

  return providers;
}

export function getProviderSeeds(): ProviderSeed[] {
  return mapFhirProviderBundle();
}

export function getLegacyProviderIds(): readonly string[] {
  return LEGACY_PROVIDER_IDS;
}
