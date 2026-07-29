import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseDateKey, toDateKey } from '@/mini-apps/period-tracker/utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';
import { usePersistHydrated } from '@/mini-apps/_kit/use-persist-hydrated';

export type PeriodPauseReason = 'pregnancy';

/** Inclusive bounds for user-configured average cycle length (days). */
export const CYCLE_LENGTH_MIN = 21;
export const CYCLE_LENGTH_MAX = 45;

export function clampCycleLength(value: number): number {
  if (!Number.isFinite(value)) {
    return 28;
  }
  return Math.min(CYCLE_LENGTH_MAX, Math.max(CYCLE_LENGTH_MIN, Math.round(value)));
}

interface PeriodTrackerState {
  cycleLength: number;
  periodLength: number;
  loggedPeriodDays: string[];
  lastPeriodStart: string | null;
  paused: boolean;
  pausedReason: PeriodPauseReason | null;
  setCycleLength: (value: number) => void;
  setPeriodLength: (value: number) => void;
  setLoggedPeriodDays: (days: string[]) => void;
  togglePeriodDay: (dayKey: string) => void;
  pauseForPregnancy: () => void;
  resume: () => void;
  clearAll: () => void;
}

/**
 * Start date + length of the most recent contiguous logged streak.
 * Used as the cycle anchor for next-period predictions and Cycle Summary.
 */
export function deriveLatestPeriodStreak(days: string[]): { start: string; length: number } | null {
  if (days.length === 0) {
    return null;
  }
  const sorted = [...days].sort((a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime());
  let streakStart = sorted[sorted.length - 1]!;
  let length = 1;
  for (let i = sorted.length - 1; i > 0; i -= 1) {
    const current = parseDateKey(sorted[i]!);
    const previous = parseDateKey(sorted[i - 1]!);
    const gapDays = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
    if (gapDays <= 1) {
      streakStart = sorted[i - 1]!;
      length += 1;
    } else {
      break;
    }
  }
  return { start: streakStart, length };
}

/** Start date of the most recent contiguous logged streak. */
export function deriveLastPeriodStart(days: string[]): string | null {
  return deriveLatestPeriodStreak(days)?.start ?? null;
}

function applyLoggedPeriodDays(loggedPeriodDays: string[]) {
  const streak = deriveLatestPeriodStreak(loggedPeriodDays);
  return {
    loggedPeriodDays,
    lastPeriodStart: streak?.start ?? null,
    ...(streak ? { periodLength: streak.length } : {}),
  };
}

export const usePeriodTrackerStore = create<PeriodTrackerState>()(
  persist(
    (set, get) => ({
      cycleLength: 28,
      periodLength: 5,
      loggedPeriodDays: [],
      lastPeriodStart: null,
      paused: false,
      pausedReason: null,
      setCycleLength: (cycleLength) => set({ cycleLength: clampCycleLength(cycleLength) }),
      setPeriodLength: (periodLength) => set({ periodLength }),
      setLoggedPeriodDays: (loggedPeriodDays) => set(applyLoggedPeriodDays(loggedPeriodDays)),
      togglePeriodDay: (dayKey) => {
        if (get().paused) {
          return;
        }
        const current = get().loggedPeriodDays;
        const exists = current.includes(dayKey);
        const loggedPeriodDays = exists
          ? current.filter((day) => day !== dayKey)
          : [...current, dayKey];
        set(applyLoggedPeriodDays(loggedPeriodDays));
      },
      pauseForPregnancy: () =>
        set({
          paused: true,
          pausedReason: 'pregnancy',
        }),
      resume: () =>
        set({
          paused: false,
          pausedReason: null,
        }),
      clearAll: () =>
        set({
          loggedPeriodDays: [],
          lastPeriodStart: null,
          paused: false,
          pausedReason: null,
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
  return usePersistHydrated(usePeriodTrackerStore.persist);
}

export function isPredictedPeriodDay(
  dayKey: string,
  lastPeriodStart: string | null,
  cycleLength: number,
  periodLength: number,
  loggedDays: string[],
  paused = false,
): boolean {
  if (paused || loggedDays.includes(dayKey) || !lastPeriodStart) {
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
