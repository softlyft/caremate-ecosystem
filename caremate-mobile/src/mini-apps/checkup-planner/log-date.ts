/** Date helpers for checkup completion logging (plan-year calendar bounds). */

export function dateInPlanYear(dayKey: string, planYear: number): boolean {
  return Number(dayKey.slice(0, 4)) === planYear;
}

/**
 * Default completion date for a plan year.
 * Always returns a date key in `planYear` when logging is allowed for that year.
 */
export function defaultCompletedDate(
  existingDate: string | undefined,
  planYear: number,
  todayKey: string,
  dateOfBirth: string,
): string {
  if (existingDate && dateInPlanYear(existingDate, planYear)) {
    return existingDate;
  }
  if (dateInPlanYear(todayKey, planYear) && todayKey >= dateOfBirth) {
    return todayKey;
  }
  if (planYear < Number(todayKey.slice(0, 4))) {
    const endOfYear = `${planYear}-12-31`;
    return endOfYear >= dateOfBirth ? endOfYear : dateOfBirth;
  }
  // Future plan year (should not be loggable yet): pin to Jan 1 of the plan year.
  return `${planYear}-01-01`;
}

export function planYearMonthBounds(
  planYear: number,
  currentYear: number,
  today: Date,
): { minMonth: Date; maxMonth: Date } {
  const minMonth = new Date(planYear, 0, 1);
  const maxMonth = new Date(
    Math.min(planYear, currentYear),
    planYear < currentYear ? 11 : today.getMonth(),
    1,
  );
  // Before the plan year starts, min is after max — pin both to January of the plan year.
  if (minMonth.getTime() > maxMonth.getTime()) {
    return { minMonth, maxMonth: minMonth };
  }
  return { minMonth, maxMonth };
}

export function clampMonthRef(
  candidate: Date,
  planYear: number,
  currentYear: number,
  today: Date,
): Date {
  const { minMonth, maxMonth } = planYearMonthBounds(planYear, currentYear, today);
  if (candidate.getTime() > maxMonth.getTime()) return maxMonth;
  if (candidate.getTime() < minMonth.getTime()) return minMonth;
  return new Date(candidate.getFullYear(), candidate.getMonth(), 1);
}

export function monthFromDateKey(
  dateKey: string,
  planYear: number,
  currentYear: number,
  today: Date,
): Date {
  const [y, m] = dateKey.split('-').map(Number);
  return clampMonthRef(new Date(y ?? planYear, (m || 1) - 1, 1), planYear, currentYear, today);
}

export function isCompletionDayAllowed(
  dayKey: string,
  planYear: number,
  todayKey: string,
  dateOfBirth: string,
): boolean {
  return dateInPlanYear(dayKey, planYear) && dayKey <= todayKey && dayKey >= dateOfBirth;
}
