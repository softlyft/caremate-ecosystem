import { create } from 'zustand';

import type { AppSettings } from '@/types';

interface SettingsState {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  hydrateFromSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  notificationsEnabled: true,
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  hydrateFromSettings: (settings) =>
    set({
      notificationsEnabled: settings.notificationsEnabled,
    }),
}));
