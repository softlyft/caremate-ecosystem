import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MedicationFrequency } from '@/mini-apps/medication-tracker/constants';
import type { Medication, MedicationDoseLog } from '@/mini-apps/medication-tracker/utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';

const EMPTY_MEDICATIONS: Medication[] = [];
const EMPTY_LOGS: MedicationDoseLog[] = [];

interface MedicationTrackerState {
  medications: Medication[];
  activeMedicationId: string | null;
  logs: MedicationDoseLog[];
  addMedication: (input: {
    name: string;
    dosage: string;
    frequency: MedicationFrequency;
    startDate: string;
    notes?: string;
    forKid?: boolean;
    familyMemberId?: string | null;
    patientName?: string | null;
  }) => Medication;
  updateMedication: (
    medicationId: string,
    input: {
      name: string;
      dosage: string;
      frequency: MedicationFrequency;
      startDate: string;
      notes?: string;
      active?: boolean;
      forKid?: boolean;
      familyMemberId?: string | null;
      patientName?: string | null;
    },
  ) => void;
  removeMedication: (medicationId: string) => void;
  setActiveMedicationId: (medicationId: string) => void;
  logDose: (input: {
    medicationId: string;
    dateKey: string;
    slotIndex: number;
    notes?: string;
  }) => MedicationDoseLog;
  removeDoseLog: (logId: string) => void;
  clearAll: () => void;
}

function normalizeMedication(medication: Medication): Medication {
  return {
    ...medication,
    forKid: Boolean(medication.forKid),
    familyMemberId: medication.familyMemberId ?? null,
    patientName: medication.patientName ?? null,
  };
}

export const useMedicationTrackerStore = create<MedicationTrackerState>()(
  persist(
    (set, get) => ({
      medications: [],
      activeMedicationId: null,
      logs: [],
      addMedication: ({
        name,
        dosage,
        frequency,
        startDate,
        notes,
        forKid = false,
        familyMemberId = null,
        patientName = null,
      }) => {
        const medication: Medication = {
          id: uuidv4(),
          name: name.trim(),
          dosage: dosage.trim(),
          frequency,
          startDate,
          notes: notes?.trim() || undefined,
          active: true,
          forKid,
          familyMemberId: forKid ? familyMemberId : null,
          patientName: forKid ? patientName : null,
        };
        set({
          medications: [...get().medications, medication],
          activeMedicationId: medication.id,
        });
        return medication;
      },
      updateMedication: (medicationId, input) => {
        set({
          medications: get().medications.map((medication) => {
            if (medication.id !== medicationId) {
              return medication;
            }
            const forKid = input.forKid ?? medication.forKid;
            return {
              ...medication,
              name: input.name.trim(),
              dosage: input.dosage.trim(),
              frequency: input.frequency,
              startDate: input.startDate,
              notes: input.notes?.trim() || undefined,
              active: input.active ?? medication.active,
              forKid,
              familyMemberId: forKid ? (input.familyMemberId ?? medication.familyMemberId) : null,
              patientName: forKid ? (input.patientName ?? medication.patientName) : null,
            };
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
      logDose: ({ medicationId, dateKey, slotIndex, notes }) => {
        const existing = get().logs.find(
          (log) =>
            log.medicationId === medicationId &&
            log.dateKey === dateKey &&
            log.slotIndex === slotIndex,
        );
        if (existing) {
          const updated: MedicationDoseLog = {
            ...existing,
            notes: notes?.trim() || undefined,
          };
          set({
            logs: get().logs.map((log) => (log.id === existing.id ? updated : log)),
          });
          return updated;
        }

        const log: MedicationDoseLog = {
          id: uuidv4(),
          medicationId,
          dateKey,
          slotIndex,
          notes: notes?.trim() || undefined,
        };
        set({ logs: [...get().logs, log] });
        return log;
      },
      removeDoseLog: (logId) => {
        set({ logs: get().logs.filter((log) => log.id !== logId) });
      },
      clearAll: () => set({ medications: [], activeMedicationId: null, logs: [] }),
    }),
    {
      name: 'caremate-medication-tracker',
      version: 1,
      storage: createJSONStorage(() => createMiniAppSyncedStorage('medication')),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<MedicationTrackerState>;
        return {
          ...state,
          medications: (state.medications ?? []).map((medication) =>
            normalizeMedication(medication),
          ),
        };
      },
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await useMedicationTrackerStore.persist.rehydrate();
});

export function useActiveMedication(): Medication | null {
  const activeMedicationId = useMedicationTrackerStore((state) => state.activeMedicationId);
  const medications = useMedicationTrackerStore((state) => state.medications);

  return useMemo(
    () => medications.find((medication) => medication.id === activeMedicationId) ?? null,
    [activeMedicationId, medications],
  );
}

export function useActiveMedicationLogs(): MedicationDoseLog[] {
  const activeMedicationId = useMedicationTrackerStore((state) => state.activeMedicationId);
  const logs = useMedicationTrackerStore((state) => state.logs);

  return useMemo(() => {
    if (!activeMedicationId) {
      return EMPTY_LOGS;
    }
    return logs.filter((log) => log.medicationId === activeMedicationId);
  }, [activeMedicationId, logs]);
}

export function useActiveMedications(): Medication[] {
  const medications = useMedicationTrackerStore((state) => state.medications);
  return useMemo(() => {
    if (medications.length === 0) {
      return EMPTY_MEDICATIONS;
    }
    return medications.map(normalizeMedication);
  }, [medications]);
}

export function useMedicationTrackerHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useMedicationTrackerStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = useMedicationTrackerStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsubscribe;
  }, [hydrated]);

  return hydrated;
}

export type { Medication, MedicationDoseLog };
