import {
  FREQUENCY_OPTIONS,
  getFrequencyOption,
  type MedicationFrequency,
} from '@/mini-apps/medication-tracker/constants';
import { parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

export type { MedicationFrequency };

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  notes?: string;
  startDate: string;
  active: boolean;
  /** When true, this medicine is for a family child (not the signed-in parent). */
  forKid: boolean;
  /** `family_members.id` when `forKid` is true. */
  familyMemberId: string | null;
  /** Display name cached at save time (survives offline). */
  patientName: string | null;
}

export interface MedicationDoseLog {
  id: string;
  medicationId: string;
  /** YYYY-MM-DD */
  dateKey: string;
  /** Slot index within the day (0-based). As-needed logs use 0+. */
  slotIndex: number;
  notes?: string;
}

export type DoseSlotStatus = 'taken' | 'due' | 'missed' | 'upcoming' | 'as-needed';

export interface DoseSlot {
  medication: Medication;
  dateKey: string;
  slotIndex: number;
  slotLabel: string;
  status: DoseSlotStatus;
  log?: MedicationDoseLog;
}

export function formatDisplayDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getFrequencyLabel(frequency: MedicationFrequency): string {
  return getFrequencyOption(frequency).label;
}

export function getMedicationPatientLabel(medication: Medication): string {
  if (medication.forKid) {
    return medication.patientName?.trim() || 'Child';
  }
  return 'You';
}

export function buildDaySlots(
  medications: Medication[],
  logs: MedicationDoseLog[],
  dateKey: string,
  referenceDate = new Date(),
): DoseSlot[] {
  const todayKey = toDateKey(referenceDate);
  const isPast = dateKey < todayKey;
  const isToday = dateKey === todayKey;

  const slots: DoseSlot[] = [];

  for (const medication of medications.filter((item) => item.active)) {
    if (medication.startDate > dateKey) {
      continue;
    }

    const option = getFrequencyOption(medication.frequency);

    if (option.dosesPerDay === 0) {
      const dayLogs = logs.filter(
        (log) => log.medicationId === medication.id && log.dateKey === dateKey,
      );
      if (dayLogs.length === 0) {
        slots.push({
          medication,
          dateKey,
          slotIndex: 0,
          slotLabel: 'As needed',
          status: 'as-needed',
        });
      } else {
        dayLogs.forEach((log, index) => {
          slots.push({
            medication,
            dateKey,
            slotIndex: log.slotIndex,
            slotLabel: dayLogs.length > 1 ? `Dose ${index + 1}` : 'As needed',
            status: 'taken',
            log,
          });
        });
      }
      continue;
    }

    for (let slotIndex = 0; slotIndex < option.dosesPerDay; slotIndex += 1) {
      const log = logs.find(
        (item) =>
          item.medicationId === medication.id &&
          item.dateKey === dateKey &&
          item.slotIndex === slotIndex,
      );

      let status: DoseSlotStatus;
      if (log) {
        status = 'taken';
      } else if (isPast) {
        status = 'missed';
      } else if (isToday) {
        status = 'due';
      } else {
        status = 'upcoming';
      }

      slots.push({
        medication,
        dateKey,
        slotIndex,
        slotLabel: option.slotLabels[slotIndex] ?? `Dose ${slotIndex + 1}`,
        status,
        log,
      });
    }
  }

  return slots;
}

export function getDaySummary(slots: DoseSlot[]) {
  const scheduled = slots.filter((slot) => slot.status !== 'as-needed' || Boolean(slot.log));
  const taken = slots.filter((slot) => slot.status === 'taken').length;
  const due = slots.filter((slot) => slot.status === 'due').length;
  const missed = slots.filter((slot) => slot.status === 'missed').length;
  const asNeededOpen = slots.filter((slot) => slot.status === 'as-needed' && !slot.log).length;

  const expected = slots.filter((slot) => slot.status !== 'as-needed').length;
  const progress = expected > 0 ? taken / expected : taken > 0 ? 1 : 0;

  return {
    total: scheduled.length,
    taken,
    due,
    missed,
    asNeededOpen,
    expected,
    progress,
    remaining: due + asNeededOpen,
  };
}

export function getStatusLabel(status: DoseSlotStatus): string {
  switch (status) {
    case 'taken':
      return 'Taken';
    case 'due':
      return 'Due';
    case 'missed':
      return 'Missed';
    case 'upcoming':
      return 'Upcoming';
    case 'as-needed':
      return 'As needed';
  }
}

export function nextSlotIndexForAsNeeded(
  medicationId: string,
  dateKey: string,
  logs: MedicationDoseLog[],
): number {
  const dayLogs = logs.filter(
    (log) => log.medicationId === medicationId && log.dateKey === dateKey,
  );
  if (dayLogs.length === 0) {
    return 0;
  }
  return Math.max(...dayLogs.map((log) => log.slotIndex)) + 1;
}

export { FREQUENCY_OPTIONS, toDateKey };
