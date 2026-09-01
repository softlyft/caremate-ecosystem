export { DEFAULT_DEVICE_DEFAULTS } from './types';
export type { DeviceDefaults, LocationMode } from './types';
export { getDeviceDefaults, setDeviceDefaults, updateDeviceDefaults } from './device-defaults';
export { useOnboardingDraftStore } from './store';
export {
  applyDeviceDefaultsToProfile,
  completePhaseA,
  getFinishSetupItems,
  getPostSignupHref,
  markEmergencyEssentialsDone,
  markFamilyPromptDone,
  resolvePostSignupHref,
  saveOnboardingEmergencyBasics,
} from './service';
export type { FinishSetupItem } from './service';
