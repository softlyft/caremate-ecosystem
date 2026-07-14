import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  calculateDueDateFromLmp,
  calculateLmpFromDueDate,
} from '@/mini-apps/pregnancy-tracker/utils';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';

export interface PregnancyDailyLog {
  dateKey: string;
  mood?: string;
  symptoms: string[];
  kickCount: number;
  notes: string;
  weightKg?: number;
}

interface PregnancyTrackerState {
  lastMenstrualPeriod: string | null;
  dueDate: string | null;
  babyNickname: string;
  dailyLogs: Record<string, PregnancyDailyLog>;
  setFromLastPeriod: (lmpKey: string) => void;
  setFromDueDate: (dueDateKey: string) => void;
  setBabyNickname: (name: string) => void;
  upsertDailyLog: (log: PregnancyDailyLog) => void;
  clearAll: () => void;
}

export const usePregnancyTrackerStore = create<PregnancyTrackerState>()(
  persist(
    (set, get) => ({
      lastMenstrualPeriod: null,
      dueDate: null,
      babyNickname: 'Baby',
      dailyLogs: {},
      setFromLastPeriod: (lmpKey) =>
        set({
          lastMenstrualPeriod: lmpKey,
          dueDate: calculateDueDateFromLmp(lmpKey),
        }),
      setFromDueDate: (dueDateKey) =>
        set({
          dueDate: dueDateKey,
          lastMenstrualPeriod: calculateLmpFromDueDate(dueDateKey),
        }),
      setBabyNickname: (babyNickname) => set({ babyNickname }),
      upsertDailyLog: (log) => {
        const dailyLogs = { ...get().dailyLogs, [log.dateKey]: log };
        set({ dailyLogs });
      },
      clearAll: () =>
        set({
          lastMenstrualPeriod: null,
          dueDate: null,
          babyNickname: 'Baby',
          dailyLogs: {},
        }),
    }),
    {
      name: 'caremate-pregnancy-tracker',
      storage: createJSONStorage(() => createMiniAppSyncedStorage('pregnancy')),
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await usePregnancyTrackerStore.persist.rehydrate();
});

export function usePregnancyTrackerHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => usePregnancyTrackerStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = usePregnancyTrackerStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsubscribe;
  }, [hydrated]);

  return hydrated;
}

export function getTodayLog(dateKey = toDateKey(new Date())): PregnancyDailyLog {
  return {
    dateKey,
    symptoms: [],
    kickCount: 0,
    notes: '',
  };
}
