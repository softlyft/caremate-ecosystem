import { addCalendarDays, todayDateKey } from '@/domains/timeline/consent-window';

export function formatTimelineDayLabel(
  dateKey: string,
  labels: { today: string; yesterday: string },
  now = new Date(),
): string {
  const today = todayDateKey(now);
  if (dateKey === today) return labels.today;
  if (dateKey === addCalendarDays(today, -1)) return labels.yesterday;
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimelineTime(occurredAt: string | null): string | null {
  if (!occurredAt) return null;
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function parseTimelineDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatTimelineDateKey(dateKey: string): string {
  return parseTimelineDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Inclusive ~90-day window ending today. */
export function defaultTimelineRange(now = new Date()): { fromDate: string; toDate: string } {
  const toDate = todayDateKey(now);
  return { fromDate: addCalendarDays(toDate, -89), toDate };
}

export function monthsInRange(
  fromDate: string,
  toDate: string,
): { key: string; label: string }[] {
  const start = parseTimelineDateKey(fromDate);
  const end = parseTimelineDateKey(toDate);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const months: { key: string; label: string }[] = [];
  while (cursor.getTime() <= last.getTime()) {
    months.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      label: cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}
