import { create } from 'zustand';

import type { LocationMode, OnboardingPriorityId } from './types';

interface OnboardingDraftState {
  priorities: OnboardingPriorityId[];
  countryCode: string | null;
  languageCode: string | null;
  state: string;
  locationMode: LocationMode | null;
  notificationsEnabled: boolean;
  locationSkipped: boolean;
  togglePriority: (id: OnboardingPriorityId) => void;
  setCountry: (countryCode: string) => void;
  setLanguage: (languageCode: string) => void;
  setState: (state: string) => void;
  setLocationMode: (mode: LocationMode) => void;
  skipLocation: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initial = {
  priorities: [] as OnboardingPriorityId[],
  countryCode: null as string | null,
  languageCode: null as string | null,
  state: '',
  locationMode: null as LocationMode | null,
  notificationsEnabled: true,
  locationSkipped: false,
};

export const useOnboardingDraftStore = create<OnboardingDraftState>((set, get) => ({
  ...initial,

  togglePriority: (id) => {
    const current = get().priorities;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    set({ priorities: next });
  },

  setCountry: (countryCode) => set({ countryCode }),
  setLanguage: (languageCode) => set({ languageCode }),
  setState: (state) => set({ state }),

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

  reset: () => set({ ...initial, priorities: [] }),
}));
