export { emergencyRepository } from '@/domains/emergency/repository';
export {
  buildEmergencyLockSnapshot,
  isEmergencyLockSurfaceEnabled,
  readEmergencyLockSnapshot,
  setEmergencyLockSurfaceEnabled,
  syncEmergencyLockSurface,
  type EmergencyLockSnapshot,
} from '@/domains/emergency/lock-surface';
export * from '@/domains/emergency/constants';
