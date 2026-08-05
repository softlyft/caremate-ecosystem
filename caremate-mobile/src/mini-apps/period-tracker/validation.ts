/**
 * Hard / soft validation for Period Tracker day toggles + clear.
 */

import {
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  deriveLatestPeriodStreak,
} from '@/mini-apps/period-tracker/store';
import { daysBetween, parseDateKey } from '@/mini-apps/_kit/date-utils';

export type PeriodIssueCode =
  | 'tracking_paused'
  | 'invalid_date'
  | 'soft_day_future'
  | 'soft_day_far_past'
  | 'soft_period_long'
  | 'soft_period_vs_cycle';

export type PeriodIssue = {
  code: PeriodIssueCode;
  messageKey: string;
  params?: Record<string, string | number>;
};

export type PeriodDayToggleDraft = {
  dayKey: string;
  todayKey: string;
  paused: boolean;
  loggedPeriodDays: string[];
  cycleLength: number;
};

export type PeriodDayToggleAssessment = {
  hard: PeriodIssue | null;
  soft: PeriodIssue[];
  /** True when the day should be added; false when removed. */
  willAdd: boolean;
  /** Proceed with toggle when hard is null (after soft confirm if needed). */
  ok: boolean;
};

export const PERIOD_FAR_PAST_DAYS = 400;
export const PERIOD_STREAK_SOFT_MAX = 10;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y == null || m == null || d == null) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function assessPeriodDayToggle(draft: PeriodDayToggleDraft): PeriodDayToggleAssessment {
  const soft: PeriodIssue[] = [];
  const willAdd = !draft.loggedPeriodDays.includes(draft.dayKey);

  if (draft.paused) {
    return {
      hard: { code: 'tracking_paused', messageKey: 'trackingPaused' },
      soft: [],
      willAdd,
      ok: false,
    };
  }

  if (!isValidDateKey(draft.dayKey) || !isValidDateKey(draft.todayKey)) {
    return {
      hard: { code: 'invalid_date', messageKey: 'unusualCheck' },
      soft: [],
      willAdd,
      ok: false,
    };
  }

  // Soft checks mainly when adding a day
  if (willAdd) {
    if (draft.dayKey > draft.todayKey) {
      soft.push({ code: 'soft_day_future', messageKey: 'dayFuture' });
    }

    const daysAgo = daysBetween(parseDateKey(draft.dayKey), parseDateKey(draft.todayKey));
    if (daysAgo > PERIOD_FAR_PAST_DAYS) {
      soft.push({
        code: 'soft_day_far_past',
        messageKey: 'dayFarPast',
        params: { days: daysAgo },
      });
    }

    const nextDays = [...draft.loggedPeriodDays, draft.dayKey];
    const streak = deriveLatestPeriodStreak(nextDays);
    if (streak && streak.length > PERIOD_STREAK_SOFT_MAX) {
      soft.push({
        code: 'soft_period_long',
        messageKey: 'periodLong',
        params: { days: streak.length },
      });
    }

    const cycleLength = Math.min(CYCLE_LENGTH_MAX, Math.max(CYCLE_LENGTH_MIN, draft.cycleLength));
    if (streak && streak.length >= cycleLength) {
      soft.push({
        code: 'soft_period_vs_cycle',
        messageKey: 'periodVsCycle',
        params: { periodDays: streak.length, cycleDays: cycleLength },
      });
    }
  }

  return {
    hard: null,
    soft,
    willAdd,
    ok: true,
  };
}
