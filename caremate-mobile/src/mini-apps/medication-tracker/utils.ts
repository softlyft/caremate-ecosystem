import {
  DEFAULT_REFILL_THRESHOLD,
  FREQUENCY_OPTIONS,
  MISSED_GRACE_MINUTES,
  defaultSlotTimesForFrequency,
  getFrequencyOption,
  type MedicationFrequency,
  type MedicationInstructionKind,
} from '@/mini-apps/medication-tracker/constants';
import { addDays, daysBetween, parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

export type { MedicationFrequency, MedicationInstructionKind };

export interface MedicationInstructions {
  kind: MedicationInstructionKind;
  text?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  notes?: string;
  startDate: string;
  /** Inclusive last day of the course. `null` = ongoing (no end). */
  endDate: string | null;
  active: boolean;
  /** When true, this medicine is for a family child (not the signed-in parent). */
  forKid: boolean;
  /** `family_members.id` when `forKid` is true. */
  familyMemberId: string | null;
  /** Display name cached at save time (survives offline). */
  patientName: string | null;
  /** Per-slot clock times `HH:mm` (length = dosesPerDay). */
  slotTimes: string[];
  instructions: MedicationInstructions;
  quantityRemaining: number | null;
  refillAtThreshold: number | null;
  refillDueDate: string | null;
}

export interface MedicationDoseLog {
  id: string;
  medicationId: string;
  /** YYYY-MM-DD */
  dateKey: string;
  /** Slot index within the day (0-based). As-needed logs use 0+. */
  slotIndex: number;
  notes?: string;
  /** ISO timestamp when the dose was marked taken. */
  takenAt?: string;
}

export type DoseSlotStatus = 'taken' | 'due' | 'missed' | 'upcoming' | 'as-needed';

export interface DoseSlot {
  medication: Medication;
  dateKey: string;
  slotIndex: number;
  slotLabel: string;
  slotTime?: string;
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

/** Inclusive course length → last calendar day (`7` days starting Mon ends Sun). */
export function endDateForDurationDays(startDate: string, durationDays: number): string {
  const days = Math.max(1, Math.floor(durationDays));
  return toDateKey(addDays(parseDateKey(startDate), days - 1));
}

/** Inclusive day count from start through end (1 when equal). */
export function durationDaysBetween(startDate: string, endDate: string): number {
  return Math.max(1, daysBetween(parseDateKey(startDate), parseDateKey(endDate)) + 1);
}

export function isMedicationScheduledOnDate(
  medication: Pick<Medication, 'startDate' | 'endDate'>,
  dateKey: string,
): boolean {
  if (medication.startDate > dateKey) {
    return false;
  }
  if (medication.endDate && medication.endDate < dateKey) {
    return false;
  }
  return true;
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

export function resolveSlotTimes(
  medication: Pick<Medication, 'frequency' | 'slotTimes'>,
): string[] {
  const option = getFrequencyOption(medication.frequency);
  if (option.dosesPerDay === 0) {
    return [];
  }
  const defaults = defaultSlotTimesForFrequency(medication.frequency);
  const times = medication.slotTimes?.length ? medication.slotTimes : defaults;
  return Array.from(
    { length: option.dosesPerDay },
    (_, index) => times[index] ?? defaults[index] ?? '08:00',
  );
}

function parseHhMmToMinutes(value: string): number {
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 8 * 60;
  }
  return hours * 60 + minutes;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function resolveScheduledStatus(params: {
  dateKey: string;
  slotTime: string;
  referenceDate: Date;
  hasLog: boolean;
}): DoseSlotStatus {
  if (params.hasLog) {
    return 'taken';
  }

  const todayKey = toDateKey(params.referenceDate);
  if (params.dateKey < todayKey) {
    return 'missed';
  }
  if (params.dateKey > todayKey) {
    return 'upcoming';
  }

  const slotMinutes = parseHhMmToMinutes(params.slotTime);
  const nowMinutes = minutesSinceMidnight(params.referenceDate);
  if (nowMinutes < slotMinutes) {
    return 'upcoming';
  }
  if (nowMinutes >= slotMinutes + MISSED_GRACE_MINUTES) {
    return 'missed';
  }
  return 'due';
}

export function buildDaySlots(
  medications: Medication[],
  logs: MedicationDoseLog[],
  dateKey: string,
  referenceDate = new Date(),
): DoseSlot[] {
  const slots: DoseSlot[] = [];

  for (const medication of medications.filter((item) => item.active)) {
    if (!isMedicationScheduledOnDate(medication, dateKey)) {
      continue;
    }

    const option = getFrequencyOption(medication.frequency);

    if (option.dosesPerDay === 0) {
      const dayLogs = logs
        .filter((log) => log.medicationId === medication.id && log.dateKey === dateKey)
        .sort((a, b) => a.slotIndex - b.slotIndex);

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

      // Keep an open as-needed row so additional doses can be logged from Today.
      slots.push({
        medication,
        dateKey,
        slotIndex: nextSlotIndexForAsNeeded(medication.id, dateKey, logs),
        slotLabel: 'As needed',
        status: 'as-needed',
      });
      continue;
    }

    const slotTimes = resolveSlotTimes(medication);
    for (let slotIndex = 0; slotIndex < option.dosesPerDay; slotIndex += 1) {
      const log = logs.find(
        (item) =>
          item.medicationId === medication.id &&
          item.dateKey === dateKey &&
          item.slotIndex === slotIndex,
      );
      const slotTime = slotTimes[slotIndex] ?? '08:00';

      slots.push({
        medication,
        dateKey,
        slotIndex,
        slotLabel: option.slotLabels[slotIndex] ?? `Dose ${slotIndex + 1}`,
        slotTime,
        status: resolveScheduledStatus({
          dateKey,
          slotTime,
          referenceDate,
          hasLog: Boolean(log),
        }),
        log,
      });
    }
  }

  return slots;
}

export function partitionTodaySlots(slots: DoseSlot[]) {
  const dueNow = slots.filter((slot) => slot.status === 'due' || slot.status === 'missed');
  const upcoming = slots.filter(
    (slot) => slot.status === 'upcoming' || slot.status === 'as-needed',
  );
  const taken = slots.filter((slot) => slot.status === 'taken');
  return { dueNow, upcoming, taken };
}

export function getDaySummary(slots: DoseSlot[]) {
  const taken = slots.filter((slot) => slot.status === 'taken').length;
  const due = slots.filter((slot) => slot.status === 'due').length;
  const missed = slots.filter((slot) => slot.status === 'missed').length;
  const asNeededOpen = slots.filter((slot) => slot.status === 'as-needed' && !slot.log).length;
  const upcoming = slots.filter((slot) => slot.status === 'upcoming').length;

  const expected = slots.filter((slot) => slot.status !== 'as-needed').length;
  const progress = expected > 0 ? taken / expected : taken > 0 ? 1 : 0;

  return {
    total: slots.length,
    taken,
    due,
    missed,
    upcoming,
    asNeededOpen,
    expected,
    progress,
    remaining: due + missed + asNeededOpen,
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

export function needsRefill(medication: Medication, todayKey: string): boolean {
  if (!medication.active) {
    return false;
  }
  const threshold = medication.refillAtThreshold ?? DEFAULT_REFILL_THRESHOLD;
  if (
    medication.quantityRemaining != null &&
    Number.isFinite(medication.quantityRemaining) &&
    medication.quantityRemaining <= threshold
  ) {
    return true;
  }
  if (medication.refillDueDate && medication.refillDueDate <= todayKey) {
    return true;
  }
  return false;
}

export function groupLogsByDate(
  logs: MedicationDoseLog[],
  medications: Medication[],
): { dateKey: string; items: { log: MedicationDoseLog; medication: Medication | undefined }[] }[] {
  const byDate = new Map<
    string,
    { log: MedicationDoseLog; medication: Medication | undefined }[]
  >();
  const medById = new Map(medications.map((medication) => [medication.id, medication]));

  const sorted = [...logs].sort((a, b) => {
    if (a.dateKey !== b.dateKey) {
      return b.dateKey.localeCompare(a.dateKey);
    }
    return (b.takenAt ?? '').localeCompare(a.takenAt ?? '');
  });

  for (const log of sorted) {
    const bucket = byDate.get(log.dateKey) ?? [];
    bucket.push({ log, medication: medById.get(log.medicationId) });
    byDate.set(log.dateKey, bucket);
  }

  return Array.from(byDate.entries()).map(([dateKey, items]) => ({ dateKey, items }));
}

export function normalizeMedication(medication: Medication): Medication {
  const frequency = medication.frequency ?? 'once-daily';
  const startDate = medication.startDate;
  let endDate = medication.endDate ?? null;
  if (endDate && startDate && endDate < startDate) {
    endDate = startDate;
  }
  return {
    ...medication,
    startDate,
    endDate,
    forKid: Boolean(medication.forKid),
    familyMemberId: medication.familyMemberId ?? null,
    patientName: medication.patientName ?? null,
    slotTimes: resolveSlotTimes({
      frequency,
      slotTimes: Array.isArray(medication.slotTimes) ? medication.slotTimes : [],
    }),
    instructions: medication.instructions ?? { kind: 'none' },
    quantityRemaining:
      medication.quantityRemaining == null || Number.isNaN(Number(medication.quantityRemaining))
        ? null
        : Number(medication.quantityRemaining),
    refillAtThreshold:
      medication.refillAtThreshold == null || Number.isNaN(Number(medication.refillAtThreshold))
        ? DEFAULT_REFILL_THRESHOLD
        : Number(medication.refillAtThreshold),
    refillDueDate: medication.refillDueDate ?? null,
  };
}

export function formatInstructionsSummary(instructions: MedicationInstructions): string | null {
  switch (instructions.kind) {
    case 'with_food':
      return 'With food';
    case 'empty_stomach':
      return 'Empty stomach';
    case 'other':
      return instructions.text?.trim() || 'Special instructions';
    case 'none':
    default:
      return instructions.text?.trim() || null;
  }
}

export { FREQUENCY_OPTIONS, toDateKey };
