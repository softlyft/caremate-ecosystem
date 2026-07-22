export { emergencyRepository } from '@/domains/emergency/repository';
export {
  buildEmergencyLockSnapshot,
  isEmergencyLockSurfaceEnabled,
  readEmergencyLockSnapshot,
  setEmergencyLockSurfaceEnabled,
  syncEmergencyLockSurface,
  type EmergencyLockSnapshot,
} from '@/domains/emergency/lock-surface';
export {
  hasRequiredIceContact,
  isCompleteIceContact,
  isValidIcePhone,
  isValidPersonName,
  sanitizePersonNameInput,
  sanitizePhoneInput,
} from '@/domains/emergency/validation';
export * from '@/domains/emergency/constants';
