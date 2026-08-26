export {
  buildEmergencyLockSnapshot,
  isEmergencyLockSurfaceEnabled,
  readEmergencyLockSnapshot,
  setEmergencyLockSurfaceEnabled,
  syncEmergencyLockSurface,
  type EmergencyLockSnapshot,
} from '@/domains/emergency/lock-surface';
export { hydrateEmergencyProfile } from '@/domains/emergency/hydrate-emergency';
export {
  isEmergencyListSet,
  isEmergencyTextSet,
  mergeEmergencyProfiles,
} from '@/domains/emergency/merge-emergency';
export {
  buildEmergencyShareUrl,
  EmergencyShareAccessError,
  fetchEmergencyByShareToken,
  generateEmergencyShareToken,
  isEmergencyShareAccessError,
  isValidEmergencyShareToken,
  parseEmergencyShareToken,
  type SharedEmergencyPayload,
} from '@/domains/emergency/share';
export {
  hasRequiredIceContact,
  isCompleteIceContact,
  isValidIcePhone,
  isValidPersonName,
  sanitizePersonNameInput,
  sanitizePhoneInput,
} from '@/domains/emergency/validation';
export * from '@/domains/emergency/constants';
export { emergencyRepository } from '@/domains/emergency/repository';
