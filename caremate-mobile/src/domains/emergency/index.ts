export {
  buildEmergencyLockSnapshot,
  isEmergencyLockSurfaceEnabled,
  readEmergencyLockSnapshot,
  setEmergencyLockSurfaceEnabled,
  syncEmergencyLockSurface,
  type EmergencyLockSnapshot,
} from '@/domains/emergency/lock-surface';
export {
  buildEmergencyShareUrl,
  fetchEmergencyByShareToken,
  generateEmergencyShareToken,
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
