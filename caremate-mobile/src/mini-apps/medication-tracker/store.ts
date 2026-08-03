import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_REFILL_THRESHOLD,
  defaultSlotTimesForFrequency,
  type MedicationFrequency,
} from '@/mini-apps/medication-tracker/constants';
import {
  normalizeMedication,
  isValidHhMm,
  toDateKey,
  type Medication,
  type MedicationDoseLog,
  type MedicationInstructions,
} from '@/mini-apps/medication-tracker/utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';
import { usePersistHydrated } from '@/mini-apps/_kit/use-persist-hydrated';

export type MedicationWriteInput = {
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  startDate: string;
  endDate?: string | null;
  notes?: string;
  forKid?: boolean;
  familyMemberId?: string | null;
  patientName?: string | null;
  slotTimes?: string[];
  instructions?: MedicationInstructions;
  quantityRemaining?: number | null;
  refillAtThreshold?: number | null;
  refillDueDate?: string | null;
};

interface MedicationTrackerState {
  medications: Medication[];
  activeMedicationId: string | null;
  logs: MedicationDoseLog[];
  addMedication: (input: MedicationWriteInput) => Medication;
  updateMedication: (
    medicationId: string,
    input: MedicationWriteInput & { active?: boolean },
  ) => void;
  removeMedication: (medicationId: string) => void;
  setActiveMedicationId: (medicationId: string) => void;
  logDose: (input: {
    medicationId: string;
    dateKey: string;
    slotIndex: number;
    notes?: string;
    /** When true, decrement quantityRemaining by 1 if tracked. */
    decrementQuantity?: boolean;
  }) => MedicationDoseLog;
  removeDoseLog: (logId: string) => void;
  clearAll: () => void;
}

function buildMedicationFields(
  input: MedicationWriteInput,
  existing?: Medication,
): Omit<Medication, 'id' | 'active'> {
  const forKid = input.forKid ?? existing?.forKid ?? false;
  const frequency = input.frequency;
  const slotTimes =
    input.slotTimes ?? existing?.slotTimes ?? defaultSlotTimesForFrequency(frequency);

  return {
    name: input.name.trim(),
    dosage: input.dosage.trim(),
    frequency,
    startDate: input.startDate,
    endDate:
      input.endDate !== undefined
        ? input.endDate && input.endDate < input.startDate
          ? input.startDate
          : input.endDate
        : (existing?.endDate ?? null),
    notes: input.notes?.trim() || undefined,
    forKid,
    familyMemberId: forKid ? (input.familyMemberId ?? existing?.familyMemberId ?? null) : null,
    patientName: forKid ? (input.patientName ?? existing?.patientName ?? null) : null,
    slotTimes: defaultSlotTimesForFrequency(frequency).map((fallback, index) => {
      const candidate = slotTimes[index];
      return candidate && isValidHhMm(candidate) ? candidate.trim() : fallback;
    }),
    instructions: input.instructions ?? existing?.instructions ?? { kind: 'none' },
    quantityRemaining:
      input.quantityRemaining !== undefined
        ? input.quantityRemaining
        : (existing?.quantityRemaining ?? null),
    refillAtThreshold:
      input.refillAtThreshold !== undefined
        ? input.refillAtThreshold
        : (existing?.refillAtThreshold ?? DEFAULT_REFILL_THRESHOLD),
    refillDueDate:
      input.refillDueDate !== undefined ? input.refillDueDate : (existing?.refillDueDate ?? null),
  };
}

export function migrateMedicationPersistedState(
  persistedState: unknown,
): Partial<MedicationTrackerState> {
  const state = (persistedState ?? {}) as Partial<MedicationTrackerState>;
  return {
    ...state,
    medications: (state.medications ?? []).map((medication) =>
      normalizeMedication(medication as Medication),
    ),
    logs: (state.logs ?? []).map((log) => ({
      ...log,
      takenAt: log.takenAt,
    })),
  };
}

export const useMedicationTrackerStore = create<MedicationTrackerState>()(
  persist(
    (set, get) => ({
      medications: [],
      activeMedicationId: null,
      logs: [],
      addMedication: (input) => {
        const todayKey = toDateKey(new Date());
        const fields = buildMedicationFields(input);
        const medication: Medication = normalizeMedication(
          {
            id: uuidv4(),
            active: true,
            ...fields,
          },
          { todayKey },
        );
        set({
          medications: [...get().medications, medication],
          activeMedicationId: medication.active ? medication.id : get().activeMedicationId,
        });
        return medication;
      },
      updateMedication: (medicationId, input) => {
        const todayKey = toDateKey(new Date());
        set({
          medications: get().medications.map((medication) => {
            if (medication.id !== medicationId) {
              return medication;
            }
            return normalizeMedication(
              {
                ...medication,
                ...buildMedicationFields(input, medication),
                active: input.active ?? medication.active,
                id: medication.id,
              },
              { todayKey },
            );
          }),
        });
      },
      removeMedication: (medicationId) => {
        const medications = get().medications.filter(
          (medication) => medication.id !== medicationId,
        );
        const activeMedicationId =
          get().activeMedicationId === medicationId
            ? (medications[0]?.id ?? null)
            : get().activeMedicationId;
        set({
          medications,
          activeMedicationId,
          logs: get().logs.filter((log) => log.medicationId !== medicationId),
        });
      },
      setActiveMedicationId: (medicationId) => {
        if (get().medications.some((medication) => medication.id === medicationId)) {
          set({ activeMedicationId: medicationId });
        }
      },
      logDose: ({ medicationId, dateKey, slotIndex, notes, decrementQuantity = true }) => {
        const existing = get().logs.find(
          (log) =>
            log.medicationId === medicationId &&
            log.dateKey === dateKey &&
            log.slotIndex === slotIndex,
        );
        const takenAt = new Date().toISOString();

        if (existing) {
          const updated: MedicationDoseLog = {
            ...existing,
            notes: notes?.trim() || undefined,
            takenAt: existing.takenAt ?? takenAt,
          };
          set({
            logs: get().logs.map((log) => (log.id === existing.id ? updated : log)),
          });
          return updated;
        }

        let didDecrementQuantity = false;
        let medications = get().medications;
        if (decrementQuantity) {
          medications = medications.map((medication) => {
            if (medication.id !== medicationId || medication.quantityRemaining == null) {
              return medication;
            }
            didDecrementQuantity = true;
            return {
              ...medication,
              quantityRemaining: Math.max(0, medication.quantityRemaining - 1),
            };
          });
        }

        const log: MedicationDoseLog = {
          id: uuidv4(),
          medicationId,
          dateKey,
          slotIndex,
          notes: notes?.trim() || undefined,
          takenAt,
          didDecrementQuantity,
        };

        set({
          medications,
          logs: [...get().logs, log],
        });
        return log;
      },
      removeDoseLog: (logId) => {
        const log = get().logs.find((item) => item.id === logId);
        if (!log) {
          return;
        }

        let medications = get().medications;
        if (log.didDecrementQuantity) {
          medications = medications.map((medication) => {
            if (medication.id !== log.medicationId || medication.quantityRemaining == null) {
              return medication;
            }
            return {
              ...medication,
              quantityRemaining: medication.quantityRemaining + 1,
            };
          });
        }

        set({
          medications,
          logs: get().logs.filter((item) => item.id !== logId),
        });
      },
      clearAll: () => set({ medications: [], activeMedicationId: null, logs: [] }),
    }),
    {
      name: 'caremate-medication-tracker',
      version: 3,
      storage: createJSONStorage(() => createMiniAppSyncedStorage('medication')),
      migrate: (persistedState) => migrateMedicationPersistedState(persistedState),
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await useMedicationTrackerStore.persist.rehydrate();
});

export function useMedicationTrackerHydrated(): boolean {
  return usePersistHydrated(useMedicationTrackerStore.persist);
}

export type { Medication, MedicationDoseLog, MedicationInstructions };
