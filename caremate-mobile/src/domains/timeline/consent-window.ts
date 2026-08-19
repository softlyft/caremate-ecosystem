/** Inclusive calendar-date window used by dated health_timeline consent. */
export function isOccurredOnInConsentWindow(params: {
  occurredOn: string;
  periodStart: string | null | undefined;
  periodEnd: string | null | undefined;
  status: string;
}): boolean {
  if (params.status !== 'active') {
    return false;
  }
  const start = params.periodStart?.trim() ?? '';
  const end = params.periodEnd?.trim() ?? '';
  if (!start || !end) {
    return false;
  }
  return params.occurredOn >= start && params.occurredOn <= end;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  return DATE_KEY.test(value);
}

export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, (day ?? 1) + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
