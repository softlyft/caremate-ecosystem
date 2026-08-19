function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function getMonthMatrix(reference: Date): (Date | null)[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function getWeekStrip(center: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(center, index - 3));
}

export function predictNextPeriodStart(
  lastPeriodStart: string | null,
  cycleLength: number,
): Date | null {
  if (!lastPeriodStart) {
    return null;
  }
  return addDays(parseDateKey(lastPeriodStart), cycleLength);
}

/** Typical luteal phase used for calendar-method ovulation (days before next period). */
export const LUTEAL_PHASE_DAYS = 14;
/** Inclusive days before ovulation that are treated as fertile (sperm lifespan). */
export const FERTILE_DAYS_BEFORE_OVULATION = 5;
/** Inclusive days after ovulation that are treated as fertile (egg lifespan). */
export const FERTILE_DAYS_AFTER_OVULATION = 1;

export type FertilityMark = 'ovulation' | 'fertile';

/**
 * Calendar-method fertility: ovulation ~14 days before the next period,
 * fertile window from 5 days before through 1 day after ovulation.
 */
export function getFertilityMark(
  dayKey: string,
  lastPeriodStart: string | null,
  cycleLength: number,
  paused = false,
): FertilityMark | null {
  if (paused || !lastPeriodStart || cycleLength < LUTEAL_PHASE_DAYS) {
    return null;
  }

  const start = parseDateKey(lastPeriodStart);
  const day = parseDateKey(dayKey);
  const delta = daysBetween(start, day);
  const cycleIndex = Math.floor(delta / cycleLength);
  const cycleStart = addDays(start, cycleIndex * cycleLength);
  const nextPeriod = addDays(cycleStart, cycleLength);
  const ovulation = addDays(nextPeriod, -LUTEAL_PHASE_DAYS);
  const ovulationKey = toDateKey(ovulation);
  if (dayKey === ovulationKey) {
    return 'ovulation';
  }

  const fertileStart = toDateKey(addDays(ovulation, -FERTILE_DAYS_BEFORE_OVULATION));
  const fertileEnd = toDateKey(addDays(ovulation, FERTILE_DAYS_AFTER_OVULATION));
  if (dayKey >= fertileStart && dayKey <= fertileEnd) {
    return 'fertile';
  }

  return null;
}

export function getCycleDay(lastPeriodStart: string | null, today = new Date()): number | null {
  if (!lastPeriodStart) {
    return null;
  }
  const diff = daysBetween(parseDateKey(lastPeriodStart), today) + 1;
  return diff > 0 ? diff : null;
}

export { toDateKey };
