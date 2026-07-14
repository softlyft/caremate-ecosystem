import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseDateKey, toDateKey } from '@/mini-apps/period-tracker/utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';

interface PeriodTrackerState {
  cycleLength: number;
  periodLength: number;
  loggedPeriodDays: string[];
  lastPeriodStart: string | null;
  setCycleLength: (value: number) => void;
  setPeriodLength: (value: number) => void;
  setLoggedPeriodDays: (days: string[]) => void;
  togglePeriodDay: (dayKey: string) => void;
  clearAll: () => void;
}

function deriveLastPeriodStart(days: string[]): string | null {
  if (days.length === 0) {
    return null;
  }
  return [...days].sort((a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime())[0];
}

export const usePeriodTrackerStore = create<PeriodTrackerState>()(
  persist(
    (set, get) => ({
      cycleLength: 28,
      periodLength: 5,
      loggedPeriodDays: [],
      lastPeriodStart: null,
      setCycleLength: (cycleLength) => set({ cycleLength }),
      setPeriodLength: (periodLength) => set({ periodLength }),
      setLoggedPeriodDays: (loggedPeriodDays) =>
        set({
          loggedPeriodDays,
          lastPeriodStart: deriveLastPeriodStart(loggedPeriodDays),
        }),
      togglePeriodDay: (dayKey) => {
        const current = get().loggedPeriodDays;
        const exists = current.includes(dayKey);
        const loggedPeriodDays = exists
          ? current.filter((day) => day !== dayKey)
          : [...current, dayKey];
        set({
          loggedPeriodDays,
          lastPeriodStart: deriveLastPeriodStart(loggedPeriodDays),
        });
      },
      clearAll: () =>
        set({
          loggedPeriodDays: [],
          lastPeriodStart: null,
        }),
    }),
    {
      name: 'caremate-period-tracker',
      storage: createJSONStorage(() => createMiniAppSyncedStorage('period')),
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await usePeriodTrackerStore.persist.rehydrate();
});

export function usePeriodTrackerHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => usePeriodTrackerStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = usePeriodTrackerStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsubscribe;
  }, [hydrated]);

  return hydrated;
}

export function isPredictedPeriodDay(
  dayKey: string,
  lastPeriodStart: string | null,
  cycleLength: number,
  periodLength: number,
  loggedDays: string[],
): boolean {
  if (loggedDays.includes(dayKey) || !lastPeriodStart) {
    return false;
  }
  const predictedStart = parseDateKey(lastPeriodStart);
  predictedStart.setDate(predictedStart.getDate() + cycleLength);
  const predictedKeys = Array.from({ length: periodLength }, (_, index) =>
    toDateKey(
      new Date(
        predictedStart.getFullYear(),
        predictedStart.getMonth(),
        predictedStart.getDate() + index,
      ),
    ),
  );
  return predictedKeys.includes(dayKey);
}
