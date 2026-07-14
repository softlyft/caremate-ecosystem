import { MILESTONES, PREGNANCY_DAYS } from '@/mini-apps/pregnancy-tracker/constants';
import { addDays, daysBetween, parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

export type Trimester = 1 | 2 | 3;

export interface GestationalAge {
  totalDays: number;
  weeks: number;
  days: number;
  trimester: Trimester;
  progress: number;
}

export interface PregnancyMilestone {
  week: number;
  title: string;
  description: string;
  daysUntil: number;
  isPast: boolean;
}

export function calculateDueDateFromLmp(lmpKey: string): string {
  return toDateKey(addDays(parseDateKey(lmpKey), PREGNANCY_DAYS));
}

export function calculateLmpFromDueDate(dueDateKey: string): string {
  return toDateKey(addDays(parseDateKey(dueDateKey), -PREGNANCY_DAYS));
}

export function getGestationalAge(
  lastMenstrualPeriod: string | null,
  referenceDate = new Date(),
): GestationalAge | null {
  if (!lastMenstrualPeriod) {
    return null;
  }

  const totalDays = Math.max(0, daysBetween(parseDateKey(lastMenstrualPeriod), referenceDate));
  const cappedDays = Math.min(totalDays, PREGNANCY_DAYS + 14);
  const weeks = Math.floor(cappedDays / 7);
  const days = cappedDays % 7;

  let trimester: Trimester = 1;
  if (weeks >= 28) {
    trimester = 3;
  } else if (weeks >= 14) {
    trimester = 2;
  }

  return {
    totalDays: cappedDays,
    weeks,
    days,
    trimester,
    progress: Math.min(1, cappedDays / PREGNANCY_DAYS),
  };
}

export function getDaysUntilDue(
  dueDateKey: string | null,
  referenceDate = new Date(),
): number | null {
  if (!dueDateKey) {
    return null;
  }
  return daysBetween(referenceDate, parseDateKey(dueDateKey));
}

export function formatDueDate(dueDateKey: string): string {
  return parseDateKey(dueDateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getUpcomingMilestones(
  lastMenstrualPeriod: string | null,
  referenceDate = new Date(),
): PregnancyMilestone[] {
  if (!lastMenstrualPeriod) {
    return [];
  }

  const lmp = parseDateKey(lastMenstrualPeriod);
  const gestationalDays = daysBetween(lmp, referenceDate);

  return MILESTONES.map((milestone) => {
    const milestoneDay = milestone.week * 7;
    const daysUntil = milestoneDay - gestationalDays;
    return {
      ...milestone,
      daysUntil,
      isPast: daysUntil < 0,
    };
  });
}

export function getTrimesterLabel(trimester: Trimester): string {
  switch (trimester) {
    case 1:
      return 'First trimester';
    case 2:
      return 'Second trimester';
    case 3:
      return 'Third trimester';
  }
}

export { toDateKey };
