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
  addEntry: (input: Omit<VitalEntry, 'id' | 'recordedAt'> & { recordedAt?: string }) => VitalEntry;
  removeEntry: (entryId: string) => void;
  setUnitPrefs: (prefs: Partial<VitalUnitPrefs>) => void;
  clearAll: () => void;
}

export const useVitalsTrackerStore = create<VitalsTrackerState>()(
  persist(
    (set, get) => ({
      entries: [],
      unitPrefs: { ...DEFAULT_UNIT_PREFS },
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
      clearAll: () => set({ entries: [], unitPrefs: { ...DEFAULT_UNIT_PREFS } }),
    }),
    {
      name: 'caremate-vitals-tracker',
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
