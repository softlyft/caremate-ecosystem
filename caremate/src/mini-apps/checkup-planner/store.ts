import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  CheckupCompletion,
  CheckupPlannerProfile,
  PlannerGender,
} from '@/mini-apps/checkup-planner/utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';

interface CheckupPlannerState {
  profile: CheckupPlannerProfile | null;
  completions: CheckupCompletion[];
  saveProfile: (input: {
    dateOfBirth: string;
    gender: PlannerGender;
    regionCode: string | null;
  }) => void;
  clearProfile: () => void;
  markComplete: (input: {
    checkupId: string;
    year: number;
    completedDate: string;
    notes?: string;
  }) => void;
  removeCompletion: (checkupId: string, year: number) => void;
  clearAll: () => void;
}

export const useCheckupPlannerStore = create<CheckupPlannerState>()(
  persist(
    (set, get) => ({
      profile: null,
      completions: [],
      saveProfile: ({ dateOfBirth, gender, regionCode }) => {
        set({
          profile: {
            dateOfBirth,
            gender,
            regionCode: regionCode?.trim().toUpperCase() || null,
          },
        });
      },
      clearProfile: () => set({ profile: null, completions: [] }),
      markComplete: ({ checkupId, year, completedDate, notes }) => {
        const without = get().completions.filter(
          (item) => !(item.checkupId === checkupId && item.year === year),
        );
        set({
          completions: [
            ...without,
            {
              checkupId,
              year,
              completedDate,
              notes: notes?.trim() || undefined,
            },
          ],
        });
      },
      removeCompletion: (checkupId, year) => {
        set({
          completions: get().completions.filter(
            (item) => !(item.checkupId === checkupId && item.year === year),
          ),
        });
      },
      clearAll: () => set({ profile: null, completions: [] }),
    }),
    {
      name: 'caremate-checkup-planner',
      storage: createJSONStorage(() => createMiniAppSyncedStorage('checkup')),
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await useCheckupPlannerStore.persist.rehydrate();
});

export function useCheckupPlannerHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useCheckupPlannerStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = useCheckupPlannerStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsubscribe;
  }, [hydrated]);

  return hydrated;
}

export type { CheckupCompletion, CheckupPlannerProfile, PlannerGender };
