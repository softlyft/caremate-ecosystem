/**
 * Mother-care TT1–TT5 ladder helpers (ANC-style maternal tetanus).
 * Independent of gestational pregnancy timeline state.
 *
 * Intervals (minimum before the next dose’s forecast date):
 * - TT1 → TT2: 4 weeks (28 days)
 * - TT2 → TT3: 6 months
 * - TT3 → TT4: 1 year
 * - TT4 → TT5: 1 year
 */

import {
  addCalendarMonths,
  addDays,
  daysBetween,
  parseDateKey,
  toDateKey,
} from '@/mini-apps/_kit/date-utils';

export const MATERNAL_TT_DOSE_IDS = ['tt1', 'tt2', 'tt3', 'tt4', 'tt5'] as const;

export type MaternalTtDoseId = (typeof MATERNAL_TT_DOSE_IDS)[number];

export interface MaternalTtDose {
  id: MaternalTtDoseId;
  dateKey: string;
}

export type MaternalTtInterval =
  | { kind: 'days'; days: number; labelKey: 'weeks4' }
  | { kind: 'months'; months: number; labelKey: 'months6' | 'year1' };

/** Minimum wait after a logged dose before the next dose’s forecast date. */
export const MATERNAL_TT_INTERVAL_AFTER: Record<
  Exclude<MaternalTtDoseId, 'tt5'>,
  MaternalTtInterval
> = {
  tt1: { kind: 'days', days: 28, labelKey: 'weeks4' },
  tt2: { kind: 'months', months: 6, labelKey: 'months6' },
  tt3: { kind: 'months', months: 12, labelKey: 'year1' },
  tt4: { kind: 'months', months: 12, labelKey: 'year1' },
};

/** @deprecated Prefer per-dose intervals via MATERNAL_TT_INTERVAL_AFTER. */
export const MATERNAL_TT_MIN_INTERVAL_DAYS = 28;

export function isMaternalTtDoseId(value: string): value is MaternalTtDoseId {
  return (MATERNAL_TT_DOSE_IDS as readonly string[]).includes(value);
}

export function maternalTtDoseIndex(id: MaternalTtDoseId): number {
  return MATERNAL_TT_DOSE_IDS.indexOf(id);
}

export function sortMaternalTtDoses(doses: MaternalTtDose[]): MaternalTtDose[] {
  return [...doses].sort((a, b) => maternalTtDoseIndex(a.id) - maternalTtDoseIndex(b.id));
}

export function getMaternalTtDose(
  doses: MaternalTtDose[],
  id: MaternalTtDoseId,
): MaternalTtDose | undefined {
  return doses.find((dose) => dose.id === id);
}

/** Next unlogged dose in the TT1–TT5 ladder, or null when complete. */
export function getNextMaternalTtDoseId(doses: MaternalTtDose[]): MaternalTtDoseId | null {
  for (const id of MATERNAL_TT_DOSE_IDS) {
    if (!getMaternalTtDose(doses, id)) {
      return id;
    }
  }
  return null;
}

export function getPreviousMaternalTtDoseId(id: MaternalTtDoseId): MaternalTtDoseId | null {
  const index = maternalTtDoseIndex(id);
  if (index <= 0) {
    return null;
  }
  return MATERNAL_TT_DOSE_IDS[index - 1] ?? null;
}

export function maternalTtSummary(doses: MaternalTtDose[]): {
  completed: number;
  total: number;
  next: MaternalTtDoseId | null;
} {
  const completed = MATERNAL_TT_DOSE_IDS.filter((id) =>
    Boolean(getMaternalTtDose(doses, id)),
  ).length;
  return {
    completed,
    total: MATERNAL_TT_DOSE_IDS.length,
    next: getNextMaternalTtDoseId(doses),
  };
}

export function applyMaternalTtInterval(fromDateKey: string, interval: MaternalTtInterval): string {
  const from = parseDateKey(fromDateKey);
  if (interval.kind === 'days') {
    return toDateKey(addDays(from, interval.days));
  }
  return toDateKey(addCalendarMonths(from, interval.months));
}

/**
 * Earliest recommended date for the next unlogged dose.
 * Null when TT1 is next (entry point, no forecast) or the ladder is complete.
 */
export function getMaternalTtForecastDateKey(doses: MaternalTtDose[]): string | null {
  const next = getNextMaternalTtDoseId(doses);
  if (!next || next === 'tt1') {
    return null;
  }
  const previousId = getPreviousMaternalTtDoseId(next);
  if (!previousId) {
    return null;
  }
  const previous = getMaternalTtDose(doses, previousId);
  if (!previous) {
    return null;
  }
  return applyMaternalTtInterval(previous.dateKey, MATERNAL_TT_INTERVAL_AFTER[previousId]);
}

export function getMaternalTtIntervalForDose(
  doseId: MaternalTtDoseId,
): MaternalTtInterval | null {
  const previousId = getPreviousMaternalTtDoseId(doseId);
  if (!previousId) {
    return null;
  }
  return MATERNAL_TT_INTERVAL_AFTER[previousId];
}

/** Days since previous ladder dose; null if no previous dose. */
export function daysSincePreviousTtDose(
  doses: MaternalTtDose[],
  id: MaternalTtDoseId,
  dateKey: string,
): number | null {
  const previousId = getPreviousMaternalTtDoseId(id);
  if (!previousId) {
    return null;
  }
  const previous = getMaternalTtDose(doses, previousId);
  if (!previous) {
    return null;
  }
  return daysBetween(parseDateKey(previous.dateKey), parseDateKey(dateKey));
}

/** True when selected date is before the recommended forecast for this dose. */
export function isMaternalTtDateBeforeForecast(
  doses: MaternalTtDose[],
  doseId: MaternalTtDoseId,
  dateKey: string,
): boolean {
  const previousId = getPreviousMaternalTtDoseId(doseId);
  if (!previousId) {
    return false;
  }
  const previous = getMaternalTtDose(doses, previousId);
  if (!previous) {
    return false;
  }
  const forecast = applyMaternalTtInterval(
    previous.dateKey,
    MATERNAL_TT_INTERVAL_AFTER[previousId],
  );
  return dateKey < forecast;
}

/**
 * True when the next open dose (TT2–TT5) has reached its forecast date.
 * TT1 is entry-only and never “due” via forecast.
 */
export function isMaternalTtNextDoseDue(doses: MaternalTtDose[], todayKey: string): boolean {
  const next = getNextMaternalTtDoseId(doses);
  if (!next || next === 'tt1') {
    return false;
  }
  const forecast = getMaternalTtForecastDateKey(doses);
  if (!forecast) {
    return false;
  }
  return todayKey >= forecast;
}

/** @deprecated Use isMaternalTtNextDoseDue — TT2-only helper for older callers. */
export function isMaternalTt2Due(doses: MaternalTtDose[], todayKey: string): boolean {
  const next = getNextMaternalTtDoseId(doses);
  if (next !== 'tt2') {
    return false;
  }
  return isMaternalTtNextDoseDue(doses, todayKey);
}

/** Monday date-key for weekly dedupe / scheduling anchors. */
export function maternalTtWeekAnchorKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  return toDateKey(addDays(date, -day));
}
