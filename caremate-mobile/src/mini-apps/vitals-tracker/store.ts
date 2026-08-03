import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_UNIT_PREFS,
  type VitalEntry,
  type VitalType,
  type VitalUnit,
  type VitalUnitPrefs,
} from '@/mini-apps/vitals-tracker/constants';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';
import { usePersistHydrated } from '@/mini-apps/_kit/use-persist-hydrated';

interface VitalsTrackerState {
  entries: VitalEntry[];
  unitPrefs: VitalUnitPrefs;
  /** Mini-app unit onboarding completed (not global onboarding). */
  hasCompletedSetup: boolean;
  addEntry: (input: Omit<VitalEntry, 'id' | 'recordedAt'> & { recordedAt?: string }) => VitalEntry;
  removeEntry: (entryId: string) => void;
  setUnitPrefs: (prefs: Partial<VitalUnitPrefs>) => void;
  completeSetup: (prefs?: Partial<VitalUnitPrefs>) => void;
  clearAll: () => void;
}

export const useVitalsTrackerStore = create<VitalsTrackerState>()(
  persist(
    (set, get) => ({
      entries: [],
      unitPrefs: { ...DEFAULT_UNIT_PREFS },
      hasCompletedSetup: false,
      addEntry: (input) => {
        const entry: VitalEntry = {
          id: uuidv4(),
          recordedAt: input.recordedAt ?? new Date().toISOString(),
          type: input.type,
          unit: input.unit,
          value: input.value,
          systolic: input.systolic,
          diastolic: input.diastolic,
          feet: input.feet,
          inches: input.inches,
          bloodSugarContext: input.bloodSugarContext,
          source: input.source ?? 'manual',
          bpPosition: input.bpPosition,
          deviceName: input.deviceName?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
        };
        set({ entries: [entry, ...get().entries] });
        return entry;
      },
      removeEntry: (entryId) => {
        set({ entries: get().entries.filter((entry) => entry.id !== entryId) });
      },
      setUnitPrefs: (prefs) => {
        set({ unitPrefs: { ...get().unitPrefs, ...prefs } });
      },
      completeSetup: (prefs) => {
        set({
          unitPrefs: prefs ? { ...get().unitPrefs, ...prefs } : get().unitPrefs,
          hasCompletedSetup: true,
        });
      },
      clearAll: () =>
        set({
          entries: [],
          unitPrefs: { ...DEFAULT_UNIT_PREFS },
          hasCompletedSetup: false,
        }),
    }),
    {
      name: 'caremate-vitals-tracker',
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<VitalsTrackerState>;
        return {
          entries: state.entries ?? [],
          unitPrefs: { ...DEFAULT_UNIT_PREFS, ...(state.unitPrefs ?? {}) },
          // Existing installs (pre-setup flag) should not be forced through onboarding again.
          hasCompletedSetup: state.hasCompletedSetup ?? true,
        };
      },
      storage: createJSONStorage(() => createMiniAppSyncedStorage('vitals')),
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await useVitalsTrackerStore.persist.rehydrate();
});

export function useVitalsTrackerHydrated(): boolean {
  return usePersistHydrated(useVitalsTrackerStore.persist);
}

export function preferUnitForType(type: VitalType, prefs: VitalUnitPrefs): VitalUnit {
  switch (type) {
    case 'blood_pressure':
      return 'mmHg';
    case 'blood_sugar':
      return prefs.blood_sugar;
    case 'heart_rate':
      return 'bpm';
    case 'body_temperature':
      return prefs.body_temperature;
    case 'weight':
      return prefs.weight;
    case 'height':
      return prefs.height;
    case 'oxygen_saturation':
      return 'percent';
    case 'respiratory_rate':
      return 'breaths_min';
  }
}
