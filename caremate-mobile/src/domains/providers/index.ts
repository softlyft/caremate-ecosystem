export { canOpenInMaps, openInExternalMaps } from '@/domains/providers/open-in-maps';
export {
  getProviderOrganizationId,
  providerConnectionService,
  type ConnectionInitiatedBy,
  type ConnectionStatus,
  type PatientProviderConnection,
} from '@/domains/providers/connection-service';
export {
  providerDocumentsService,
  PROVIDER_DOCUMENT_TYPES,
  type DocumentOrgOption,
  type ProviderDocument,
  type ProviderDocumentSource,
  type ProviderDocumentType,
} from '@/domains/providers/documents-service';
export { providerRepository } from '@/domains/providers/repository';
export { getLegacyProviderIds, getProviderSeeds } from '@/domains/providers/utils/fhir-providers';
export { resolveNearbyCoords } from '@/domains/providers/location';
export type { NearbyCoords, NearbyLocationPrecision } from '@/domains/providers/location';
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
