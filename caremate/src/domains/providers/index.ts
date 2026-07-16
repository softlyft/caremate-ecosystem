export { canOpenInMaps, openInExternalMaps } from '@/domains/providers/open-in-maps';
export { providerRepository } from '@/domains/providers/repository';
export { getLegacyProviderIds, getProviderSeeds } from '@/domains/providers/utils/fhir-providers';
export { resolveNearbyCoords } from '@/domains/providers/location';
export type { NearbyCoords } from '@/domains/providers/location';
export {
  formatProviderType,
  isProviderType,
  PRIMARY_PROVIDER_TYPES,
  PROVIDER_TYPE_LABELS,
  PROVIDER_TYPES,
  type PrimaryProviderType,
  type ProviderAttributes,
  type ProviderType,
} from '@/domains/providers/types';
