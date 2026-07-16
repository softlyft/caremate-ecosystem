export const ONBOARDING_PRIORITIES = [
  {
    id: 'emergency',
    label: 'Emergency',
    description: 'Offline health card for first responders',
  },
  {
    id: 'nearby',
    label: 'Nearby care',
    description: 'Hospitals, clinics, and pharmacies around you',
  },
  {
    id: 'family',
    label: 'Family / kids',
    description: 'Household profiles and shared kids care',
  },
  {
    id: 'learn',
    label: 'Learn',
    description: 'Trusted health articles and tips',
  },
] as const;

export type OnboardingPriorityId = (typeof ONBOARDING_PRIORITIES)[number]['id'];

export type LocationMode = 'precise' | 'approximate';

export type DeviceDefaults = {
  countryCode: string | null;
  state: string | null;
  locationMode: LocationMode | null;
  priorities: OnboardingPriorityId[];
  notificationsEnabled: boolean;
  regionSkipped: boolean;
  locationSkipped: boolean;
  emergencyEssentialsDone: boolean;
  familyPromptDone: boolean;
};

export const DEFAULT_DEVICE_DEFAULTS: DeviceDefaults = {
  countryCode: null,
  state: null,
  locationMode: null,
  priorities: [],
  notificationsEnabled: true,
  regionSkipped: false,
  locationSkipped: false,
  emergencyEssentialsDone: false,
  familyPromptDone: false,
};
