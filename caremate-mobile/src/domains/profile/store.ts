import { create } from 'zustand';

import type { AppSettings } from '@/types';

interface SettingsState {
  notificationsEnabled: boolean;
  dailyTipRemindersEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDailyTipRemindersEnabled: (enabled: boolean) => void;
  hydrateFromSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  notificationsEnabled: true,
  dailyTipRemindersEnabled: true,
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  setDailyTipRemindersEnabled: (dailyTipRemindersEnabled) => set({ dailyTipRemindersEnabled }),
  hydrateFromSettings: (settings) =>
    set({
      notificationsEnabled: settings.notificationsEnabled,
      dailyTipRemindersEnabled: settings.dailyTipRemindersEnabled !== false,
    }),
}));
