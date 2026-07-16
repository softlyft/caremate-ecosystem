export { ONBOARDING_PRIORITIES, DEFAULT_DEVICE_DEFAULTS } from './types';
export type {
  DeviceDefaults,
  LocationMode,
  OnboardingPriorityId,
} from './types';
export {
  getDeviceDefaults,
  setDeviceDefaults,
  updateDeviceDefaults,
} from './device-defaults';
export { useOnboardingDraftStore } from './store';
export {
  applyDeviceDefaultsToProfile,
  completePhaseA,
  getFinishSetupItems,
  getPostSignupHref,
  markEmergencyEssentialsDone,
  markFamilyPromptDone,
  resolvePostSignupHref,
} from './service';
export type { FinishSetupItem } from './service';
