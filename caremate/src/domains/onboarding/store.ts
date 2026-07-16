import { create } from 'zustand';

import type { LocationMode, OnboardingPriorityId } from './types';

interface OnboardingDraftState {
  priorities: OnboardingPriorityId[];
  countryCode: string | null;
  state: string;
  locationMode: LocationMode | null;
  notificationsEnabled: boolean;
  regionSkipped: boolean;
  locationSkipped: boolean;
  togglePriority: (id: OnboardingPriorityId) => void;
  setRegion: (countryCode: string | null, state: string) => void;
  skipRegion: () => void;
  setLocationMode: (mode: LocationMode) => void;
  skipLocation: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initial = {
  priorities: [] as OnboardingPriorityId[],
  countryCode: null as string | null,
  state: '',
  locationMode: null as LocationMode | null,
  notificationsEnabled: true,
  regionSkipped: false,
  locationSkipped: false,
};

export const useOnboardingDraftStore = create<OnboardingDraftState>((set, get) => ({
  ...initial,

  togglePriority: (id) => {
    const current = get().priorities;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    set({ priorities: next });
  },

  setRegion: (countryCode, state) =>
    set({
      countryCode,
      state,
      regionSkipped: false,
    }),

  skipRegion: () =>
    set({
      countryCode: null,
      state: '',
      regionSkipped: true,
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

  reset: () => set({ ...initial, priorities: [] }),
}));
