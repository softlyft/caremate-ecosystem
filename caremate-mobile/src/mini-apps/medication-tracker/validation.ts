/**
 * Hard / soft validation for Medication Assistant setup + dose logging.
 * Tone matches vitals: block impossible values; confirm unusual ones.
 */

import {
  DEFAULT_REFILL_THRESHOLD,
  getFrequencyOption,
  type MedicationFrequency,
  type MedicationInstructionKind,
} from '@/mini-apps/medication-tracker/constants';
import {
  areValidSlotTimes,
  durationDaysBetween,
  isMedicationScheduledOnDate,
  isMedicationTreatmentEnded,
  isValidHhMm,
  parseHhMmParts,
  type Medication,
  type MedicationDoseLog,
  type MedicationInstructions,
} from '@/mini-apps/medication-tracker/utils';

/** Validated payload for add/update medication (mirrors store write input). */
export type MedicationWritePayload = {
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

export type MedicationIssueCode =
  | 'required_name'
  | 'required_dosage'
  | 'required_start'
  | 'end_before_start'
  | 'treatment_ended'
  | 'child_required'
  | 'slot_times_invalid'
  | 'slot_times_duplicate'
  | 'quantity_invalid'
  | 'threshold_invalid'
  | 'refill_date_invalid'
  | 'soft_name_long'
  | 'soft_dosage_no_unit'
  | 'soft_slots_close'
  | 'soft_course_long'
  | 'soft_refill_before_start'
  | 'soft_quantity_high'
  | 'soft_threshold_above_quantity'
  | 'soft_instructions_other_empty'
  | 'soft_log_before_start'
  | 'soft_log_after_end'
  | 'soft_log_future'
  | 'soft_as_needed_many';

export type MedicationIssue = {
  code: MedicationIssueCode;
  /** i18n key under apps.medication.validation.* */
  messageKey: string;
  params?: Record<string, string | number>;
};

export type MedicationWriteDraft = {
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  startDate: string | null;
  endDate: string | null;
  notes?: string;
  forKid: boolean;
  familyMemberId: string | null;
  patientName: string | null;
  slotTimes: string[];
  instructionKind: MedicationInstructionKind;
  instructionText: string;
  quantityText: string;
  refillThresholdText: string;
  refillDueDate: string | null;
  /** Editing an existing med may reactivate; used with active flag externally. */
  todayKey: string;
  hasSelectedChild: boolean;
};

export type MedicationWriteAssessment = {
  hard: MedicationIssue | null;
  soft: MedicationIssue[];
  payload: MedicationWritePayload | null;
};

export type DoseLogDraft = {
  medication: Medication;
  dateKey: string;
  slotIndex: number;
  notes?: string;
  todayKey: string;
  /** Existing logs for as-needed count (same med + day). */
  logs: MedicationDoseLog[];
  /** True when updating an existing fixed-schedule log (skip as-needed count bump). */
  isUpdate?: boolean;
};

export type DoseLogAssessment = {
  hard: MedicationIssue | null;
  soft: MedicationIssue[];
  payload: {
    medicationId: string;
    dateKey: string;
    slotIndex: number;
    notes?: string;
  } | null;
};

export const NAME_SOFT_MAX = 80;
export const QUANTITY_SOFT_MAX = 1000;
export const COURSE_SOFT_MAX_DAYS = 365;
export const SLOT_MIN_GAP_MINUTES = 120;
export const AS_NEEDED_SOFT_MAX_PER_DAY = 8;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Digits only (optional decimal) — no unit letters. */
const DOSAGE_DIGITS_ONLY_RE = /^\d+(\.\d+)?$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y == null || m == null || d == null) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Parse optional non-negative integer from user text.
 * Empty → null. Invalid / negative / non-integer → `{ error: true }`.
 */
export function parseOptionalNonNegativeInteger(raw: string): {
  value: number | null;
  error: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: false };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { value: null, error: true };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return { value: null, error: true };
  }
  return { value, error: false };
}

export function hasDuplicateSlotTimes(times: string[], expectedCount: number): boolean {
  if (expectedCount <= 0) return false;
  const slice = times.slice(0, expectedCount).map((t) => t.trim());
  return new Set(slice).size < slice.length;
}

/** True when any two valid slots are less than `minGapMinutes` apart (circular day ignored). */
export function slotsTooClose(
  times: string[],
  expectedCount: number,
  minGapMinutes = SLOT_MIN_GAP_MINUTES,
): boolean {
  if (expectedCount < 2) return false;
  const minutes = times
    .slice(0, expectedCount)
    .map((t) => parseHhMmParts(t.trim()))
    .filter((p): p is { hours: number; minutes: number } => p != null)
    .map((p) => p.hours * 60 + p.minutes)
    .sort((a, b) => a - b);

  if (minutes.length < 2) return false;
  for (let i = 1; i < minutes.length; i += 1) {
    if (minutes[i]! - minutes[i - 1]! < minGapMinutes) {
      return true;
    }
  }
  return false;
}

export function dosageLooksLikeDigitsOnly(dosage: string): boolean {
  return DOSAGE_DIGITS_ONLY_RE.test(dosage.trim());
}

function buildInstructions(kind: MedicationInstructionKind, text: string): MedicationInstructions {
  return {
    kind,
    text: kind === 'other' || kind === 'none' ? text.trim() || undefined : undefined,
  };
}

export function assessMedicationWrite(draft: MedicationWriteDraft): MedicationWriteAssessment {
  const soft: MedicationIssue[] = [];
  const name = draft.name.trim();
  const dosage = draft.dosage.trim();
  const frequencyOption = getFrequencyOption(draft.frequency);
  const showSchedule = frequencyOption.dosesPerDay > 0;

  if (!name) {
    return {
      hard: { code: 'required_name', messageKey: 'requiredName' },
      soft: [],
      payload: null,
    };
  }
  if (!dosage) {
    return {
      hard: { code: 'required_dosage', messageKey: 'requiredDosage' },
      soft: [],
      payload: null,
    };
  }
  if (!draft.startDate || !isValidDateKey(draft.startDate)) {
    return {
      hard: { code: 'required_start', messageKey: 'requiredStart' },
      soft: [],
      payload: null,
    };
  }

  const startDate = draft.startDate;

  if (draft.endDate && !isValidDateKey(draft.endDate)) {
    return {
      hard: { code: 'end_before_start', messageKey: 'unusualCheck' },
      soft: [],
      payload: null,
    };
  }

  const resolvedEnd = draft.endDate && isValidDateKey(draft.endDate) ? draft.endDate : null;

  if (resolvedEnd && resolvedEnd < startDate) {
    return {
      hard: { code: 'end_before_start', messageKey: 'endBeforeStart' },
      soft: [],
      payload: null,
    };
  }

  if (isMedicationTreatmentEnded({ endDate: resolvedEnd }, draft.todayKey)) {
    return {
      hard: { code: 'treatment_ended', messageKey: 'treatmentEnded' },
      soft: [],
      payload: null,
    };
  }

  if (draft.forKid && !draft.hasSelectedChild) {
    return {
      hard: { code: 'child_required', messageKey: 'childRequired' },
      soft: [],
      payload: null,
    };
  }

  if (showSchedule) {
    if (!areValidSlotTimes(draft.slotTimes, frequencyOption.dosesPerDay)) {
      return {
        hard: { code: 'slot_times_invalid', messageKey: 'slotTimesInvalid' },
        soft: [],
        payload: null,
      };
    }
    if (hasDuplicateSlotTimes(draft.slotTimes, frequencyOption.dosesPerDay)) {
      return {
        hard: { code: 'slot_times_duplicate', messageKey: 'slotTimesDuplicate' },
        soft: [],
        payload: null,
      };
    }
    if (slotsTooClose(draft.slotTimes, frequencyOption.dosesPerDay)) {
      soft.push({ code: 'soft_slots_close', messageKey: 'slotsTooClose' });
    }
  }

  const quantityParsed = parseOptionalNonNegativeInteger(draft.quantityText);
  if (quantityParsed.error) {
    return {
      hard: { code: 'quantity_invalid', messageKey: 'quantityInvalid' },
      soft: [],
      payload: null,
    };
  }

  const thresholdRaw = draft.refillThresholdText.trim();
  let refillAtThreshold: number | null = DEFAULT_REFILL_THRESHOLD;
  if (thresholdRaw) {
    const thresholdParsed = parseOptionalNonNegativeInteger(draft.refillThresholdText);
    if (thresholdParsed.error) {
      return {
        hard: { code: 'threshold_invalid', messageKey: 'thresholdInvalid' },
        soft: [],
        payload: null,
      };
    }
    refillAtThreshold = thresholdParsed.value ?? DEFAULT_REFILL_THRESHOLD;
  }

  if (draft.refillDueDate) {
    if (!isValidDateKey(draft.refillDueDate)) {
      return {
        hard: { code: 'refill_date_invalid', messageKey: 'unusualCheck' },
        soft: [],
        payload: null,
      };
    }
    if (draft.refillDueDate < startDate) {
      soft.push({ code: 'soft_refill_before_start', messageKey: 'refillBeforeStart' });
    }
  }

  if (name.length > NAME_SOFT_MAX) {
    soft.push({
      code: 'soft_name_long',
      messageKey: 'nameLong',
      params: { max: NAME_SOFT_MAX },
    });
  }

  if (dosageLooksLikeDigitsOnly(dosage)) {
    soft.push({ code: 'soft_dosage_no_unit', messageKey: 'dosageNoUnit' });
  }

  if (resolvedEnd) {
    const days = durationDaysBetween(startDate, resolvedEnd);
    if (days > COURSE_SOFT_MAX_DAYS) {
      soft.push({
        code: 'soft_course_long',
        messageKey: 'courseLong',
        params: { days },
      });
    }
  }

  if (quantityParsed.value != null && quantityParsed.value > QUANTITY_SOFT_MAX) {
    soft.push({
      code: 'soft_quantity_high',
      messageKey: 'quantityHigh',
      params: { value: quantityParsed.value },
    });
  }

  if (
    quantityParsed.value != null &&
    refillAtThreshold != null &&
    refillAtThreshold > quantityParsed.value
  ) {
    soft.push({ code: 'soft_threshold_above_quantity', messageKey: 'thresholdAboveQuantity' });
  }

  if (draft.instructionKind === 'other' && !draft.instructionText.trim()) {
    soft.push({ code: 'soft_instructions_other_empty', messageKey: 'instructionsOtherEmpty' });
  }

  const payload: MedicationWritePayload = {
    name,
    dosage,
    frequency: draft.frequency,
    startDate,
    endDate: resolvedEnd,
    notes: draft.notes,
    forKid: draft.forKid,
    familyMemberId: draft.forKid ? draft.familyMemberId : null,
    patientName: draft.forKid ? draft.patientName : null,
    slotTimes: showSchedule
      ? draft.slotTimes.slice(0, frequencyOption.dosesPerDay).map((t) => t.trim())
      : [],
    instructions: buildInstructions(draft.instructionKind, draft.instructionText),
    quantityRemaining: quantityParsed.value,
    refillAtThreshold,
    refillDueDate: draft.refillDueDate,
  };

  return { hard: null, soft, payload };
}

export function assessDoseLog(draft: DoseLogDraft): DoseLogAssessment {
  const soft: MedicationIssue[] = [];
  const { medication, dateKey, todayKey } = draft;

  if (!isValidDateKey(dateKey)) {
    return {
      hard: { code: 'required_start', messageKey: 'unusualCheck' },
      soft: [],
      payload: null,
    };
  }

  if (dateKey < medication.startDate) {
    soft.push({ code: 'soft_log_before_start', messageKey: 'logBeforeStart' });
  } else if (medication.endDate && dateKey > medication.endDate) {
    soft.push({ code: 'soft_log_after_end', messageKey: 'logAfterEnd' });
  }

  if (dateKey > todayKey) {
    soft.push({ code: 'soft_log_future', messageKey: 'logFuture' });
  }

  const option = getFrequencyOption(medication.frequency);
  if (option.dosesPerDay === 0 && !draft.isUpdate) {
    const countToday = draft.logs.filter(
      (log) => log.medicationId === medication.id && log.dateKey === dateKey,
    ).length;
    if (countToday >= AS_NEEDED_SOFT_MAX_PER_DAY) {
      soft.push({
        code: 'soft_as_needed_many',
        messageKey: 'asNeededMany',
        params: { count: countToday },
      });
    }
  }

  return {
    hard: null,
    soft,
    payload: {
      medicationId: medication.id,
      dateKey,
      slotIndex: draft.slotIndex,
      notes: draft.notes,
    },
  };
}

/** Convenience: whether a date is inside the course (inclusive). */
export function isDoseDateInCourse(
  medication: Pick<Medication, 'startDate' | 'endDate'>,
  dateKey: string,
): boolean {
  return isMedicationScheduledOnDate(medication, dateKey);
}

/** True when every slot HH:mm is valid (re-export helper for tests). */
export { areValidSlotTimes, isValidHhMm };
