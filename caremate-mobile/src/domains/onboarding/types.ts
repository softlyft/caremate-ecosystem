export const ONBOARDING_PRIORITY_IDS = ['emergency', 'nearby', 'family', 'learn'] as const;

export type OnboardingPriorityId = (typeof ONBOARDING_PRIORITY_IDS)[number];

/** @deprecated Use ONBOARDING_PRIORITY_IDS with useTranslation() for labels. */
export const ONBOARDING_PRIORITIES = ONBOARDING_PRIORITY_IDS.map((id) => ({ id }));

export type LocationMode = 'precise' | 'approximate';

export type DeviceDefaults = {
  countryCode: string | null;
  languageCode: string | null;
  state: string | null;
  locationMode: LocationMode | null;
  priorities: OnboardingPriorityId[];
  notificationsEnabled: boolean;
  locationSkipped: boolean;
  emergencyEssentialsDone: boolean;
  familyPromptDone: boolean;
};

export const DEFAULT_DEVICE_DEFAULTS: DeviceDefaults = {
  countryCode: null,
  languageCode: null,
  state: null,
  locationMode: null,
  priorities: [],
  notificationsEnabled: true,
  locationSkipped: false,
  emergencyEssentialsDone: false,
  familyPromptDone: false,
};
