/**
 * Mother-care TT1–TT5 ladder helpers (ANC-style maternal tetanus).
 * Independent of gestational pregnancy timeline state.
 */

import { daysBetween, parseDateKey } from '@/mini-apps/_kit/date-utils';

export const MATERNAL_TT_DOSE_IDS = ['tt1', 'tt2', 'tt3', 'tt4', 'tt5'] as const;

export type MaternalTtDoseId = (typeof MATERNAL_TT_DOSE_IDS)[number];

export interface MaternalTtDose {
  id: MaternalTtDoseId;
  dateKey: string;
}

/** Minimum recommended gap between consecutive TT doses (4 weeks). */
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

/** True when TT2 is due: TT1 logged, TT2 missing, ≥28 days since TT1. */
export function isMaternalTt2Due(doses: MaternalTtDose[], todayKey: string): boolean {
  const tt1 = getMaternalTtDose(doses, 'tt1');
  const tt2 = getMaternalTtDose(doses, 'tt2');
  if (!tt1 || tt2) {
    return false;
  }
  return (
    daysBetween(parseDateKey(tt1.dateKey), parseDateKey(todayKey)) >= MATERNAL_TT_MIN_INTERVAL_DAYS
  );
}
