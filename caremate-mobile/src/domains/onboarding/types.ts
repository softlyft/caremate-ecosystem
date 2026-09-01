export type LocationMode = 'precise' | 'approximate';

export type DeviceDefaults = {
  countryCode: string | null;
  languageCode: string | null;
  state: string | null;
  locationMode: LocationMode | null;
  notificationsEnabled: boolean;
  locationSkipped: boolean;
  emergencyBasicsStarted: boolean;
  wantsFamily: boolean;
  emergencyEssentialsDone: boolean;
  familyPromptDone: boolean;
};

export const DEFAULT_DEVICE_DEFAULTS: DeviceDefaults = {
  countryCode: null,
  languageCode: null,
  state: null,
  locationMode: null,
  notificationsEnabled: true,
  locationSkipped: false,
  emergencyBasicsStarted: false,
  wantsFamily: false,
  emergencyEssentialsDone: false,
  familyPromptDone: false,
};
