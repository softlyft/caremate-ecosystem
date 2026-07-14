import { create } from 'zustand';

import type { AppSettings } from '@/types';

interface SettingsState {
  theme: AppSettings['theme'];
  notificationsEnabled: boolean;
  setTheme: (theme: AppSettings['theme']) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  hydrateFromSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  notificationsEnabled: true,
  setTheme: (theme) => set({ theme }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  hydrateFromSettings: (settings) =>
    set({
      theme: settings.theme,
      notificationsEnabled: settings.notificationsEnabled,
    }),
}));
