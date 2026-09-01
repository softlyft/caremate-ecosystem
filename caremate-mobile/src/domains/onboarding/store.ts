import { create } from 'zustand';

import type { LocationMode } from './types';

interface OnboardingDraftState {
  countryCode: string | null;
  languageCode: string | null;
  state: string;
  bloodGroup: string;
  genotype: string;
  allergies: string;
  emergencyBasicsSaved: boolean;
  emergencyBasicsSkipped: boolean;
  locationMode: LocationMode | null;
  notificationsEnabled: boolean;
  locationSkipped: boolean;
  wantsFamily: boolean;
  setCountry: (countryCode: string) => void;
  setLanguage: (languageCode: string) => void;
  setState: (state: string) => void;
  setEmergencyBasics: (input: { bloodGroup: string; genotype: string; allergies: string }) => void;
  markEmergencyBasicsSaved: () => void;
  skipEmergencyBasics: () => void;
  setLocationMode: (mode: LocationMode) => void;
  skipLocation: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setWantsFamily: (wantsFamily: boolean) => void;
  reset: () => void;
}

const initial = {
  countryCode: null as string | null,
  languageCode: null as string | null,
  state: '',
  bloodGroup: '',
  genotype: '',
  allergies: '',
  emergencyBasicsSaved: false,
  emergencyBasicsSkipped: false,
  locationMode: null as LocationMode | null,
  notificationsEnabled: true,
  locationSkipped: false,
  wantsFamily: false,
};

export const useOnboardingDraftStore = create<OnboardingDraftState>((set) => ({
  ...initial,

  setCountry: (countryCode) => set({ countryCode }),
  setLanguage: (languageCode) => set({ languageCode }),
  setState: (state) => set({ state }),

  setEmergencyBasics: (input) =>
    set({
      bloodGroup: input.bloodGroup,
      genotype: input.genotype,
      allergies: input.allergies,
    }),

  markEmergencyBasicsSaved: () =>
    set({
      emergencyBasicsSaved: true,
      emergencyBasicsSkipped: false,
    }),

  skipEmergencyBasics: () =>
    set({
      emergencyBasicsSkipped: true,
      emergencyBasicsSaved: false,
    }),

  setLocationMode: (mode) =>
    set({
      locationMode: mode,
      locationSkipped: false,
    }),

  skipLocation: () =>
    set({
      locationMode: 'approximate',
      locationSkipped: true,
    }),

  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),

  setWantsFamily: (wantsFamily) => set({ wantsFamily }),

  reset: () => set({ ...initial }),
}));
