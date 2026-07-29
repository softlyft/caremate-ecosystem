import { useMemo } from 'react';

import {
  useMedicationTrackerStore,
  type Medication,
  type MedicationDoseLog,
} from '@/mini-apps/medication-tracker/store';
import { normalizeMedication } from '@/mini-apps/medication-tracker/utils';

const EMPTY_MEDICATIONS: Medication[] = [];
const EMPTY_LOGS: MedicationDoseLog[] = [];

export function useActiveMedication(): Medication | null {
  const activeMedicationId = useMedicationTrackerStore((state) => state.activeMedicationId);
  const medications = useMedicationTrackerStore((state) => state.medications);

  return useMemo(() => {
    const found = medications.find((medication) => medication.id === activeMedicationId);
    return found ? normalizeMedication(found) : null;
  }, [activeMedicationId, medications]);
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
    return medications.map((medication) => normalizeMedication(medication));
  }, [medications]);
}
