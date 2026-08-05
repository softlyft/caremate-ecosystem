/**
 * Hard / soft validation for Pregnancy Tracker setup + daily log.
 */

import {
  MOOD_OPTIONS,
  PREGNANCY_DAYS,
  SYMPTOM_OPTIONS,
} from '@/mini-apps/pregnancy-tracker/constants';
import {
  calculateDueDateFromLmp,
  calculateLmpFromDueDate,
} from '@/mini-apps/pregnancy-tracker/utils';
import { daysBetween, parseDateKey } from '@/mini-apps/_kit/date-utils';

export type PregnancyIssueCode =
  | 'required_date'
  | 'invalid_date'
  | 'lmp_future'
  | 'due_too_far'
  | 'soft_past_term'
  | 'soft_due_in_past'
  | 'soft_nickname_long'
  | 'soft_will_pause_period'
  | 'soft_kicks_high'
  | 'soft_notes_long'
  | 'soft_empty_log'
  | 'kicks_negative';

export type PregnancyIssue = {
  code: PregnancyIssueCode;
  messageKey: string;
  params?: Record<string, string | number>;
};

export type PregnancySetupMode = 'lmp' | 'due-date';

export type PregnancySetupDraft = {
  mode: PregnancySetupMode;
  selectedDate: string | null;
  babyNickname: string;
  todayKey: string;
  /** True when period tracker is currently active (not paused). */
  periodTrackerActive: boolean;
};

export type PregnancySetupAssessment = {
  hard: PregnancyIssue | null;
  soft: PregnancyIssue[];
  payload: {
    mode: PregnancySetupMode;
    selectedDate: string;
    babyNickname: string;
  } | null;
};

export type PregnancyLogDraft = {
  dateKey: string;
  mood?: string;
  symptoms: string[];
  kickCount: number;
  notes: string;
};

export type PregnancyLogAssessment = {
  hard: PregnancyIssue | null;
  soft: PregnancyIssue[];
  payload: {
    dateKey: string;
    mood?: string;
    symptoms: string[];
    kickCount: number;
    notes: string;
  } | null;
};

export const NICKNAME_SOFT_MAX = 40;
export const KICKS_SOFT_MAX = 50;
export const NOTES_SOFT_MAX = 500;
/** Soft-warn when LMP implies more than ~42 weeks pregnant. */
export const PAST_TERM_DAYS = 42 * 7;
/** Hard-reject due dates more than ~43 weeks ahead of today. */
export const DUE_FUTURE_HARD_DAYS = PREGNANCY_DAYS + 21;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MOOD_SET = new Set<string>(MOOD_OPTIONS);
const SYMPTOM_SET = new Set<string>(SYMPTOM_OPTIONS);

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y == null || m == null || d == null) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function assessPregnancySetupDraft(draft: PregnancySetupDraft): PregnancySetupAssessment {
  const soft: PregnancyIssue[] = [];

  if (!draft.selectedDate) {
    return {
      hard: { code: 'required_date', messageKey: 'requiredDate' },
      soft: [],
      payload: null,
    };
  }

  if (!isValidDateKey(draft.selectedDate) || !isValidDateKey(draft.todayKey)) {
    return {
      hard: { code: 'invalid_date', messageKey: 'unusualCheck' },
      soft: [],
      payload: null,
    };
  }

  const today = parseDateKey(draft.todayKey);
  const selected = parseDateKey(draft.selectedDate);

  if (draft.mode === 'lmp') {
    if (draft.selectedDate > draft.todayKey) {
      return {
        hard: { code: 'lmp_future', messageKey: 'lmpFuture' },
        soft: [],
        payload: null,
      };
    }
    const daysSinceLmp = daysBetween(selected, today);
    if (daysSinceLmp > PAST_TERM_DAYS) {
      soft.push({
        code: 'soft_past_term',
        messageKey: 'pastTerm',
        params: { weeks: Math.floor(daysSinceLmp / 7) },
      });
    }
  } else {
    const daysUntilDue = daysBetween(today, selected);
    if (daysUntilDue > DUE_FUTURE_HARD_DAYS) {
      return {
        hard: { code: 'due_too_far', messageKey: 'dueTooFar' },
        soft: [],
        payload: null,
      };
    }
    if (draft.selectedDate < draft.todayKey) {
      soft.push({
        code: 'soft_due_in_past',
        messageKey: 'dueInPast',
        params: { days: Math.abs(daysUntilDue) },
      });
    }
    // Implied LMP far in the past via due date also covered by pastTerm feel
    const impliedLmp = calculateLmpFromDueDate(draft.selectedDate);
    const daysSinceImplied = daysBetween(parseDateKey(impliedLmp), today);
    if (daysSinceImplied > PAST_TERM_DAYS && draft.selectedDate >= draft.todayKey) {
      soft.push({
        code: 'soft_past_term',
        messageKey: 'pastTerm',
        params: { weeks: Math.floor(daysSinceImplied / 7) },
      });
    }
  }

  const nickname = draft.babyNickname.trim() || 'Baby';
  if (draft.babyNickname.trim().length > NICKNAME_SOFT_MAX) {
    soft.push({
      code: 'soft_nickname_long',
      messageKey: 'nicknameLong',
      params: { max: NICKNAME_SOFT_MAX },
    });
  }

  if (draft.periodTrackerActive) {
    soft.push({ code: 'soft_will_pause_period', messageKey: 'willPausePeriod' });
  }

  // Ensure LMP mode still produces a due date (sanity)
  if (draft.mode === 'lmp') {
    void calculateDueDateFromLmp(draft.selectedDate);
  }

  return {
    hard: null,
    soft,
    payload: {
      mode: draft.mode,
      selectedDate: draft.selectedDate,
      babyNickname: nickname,
    },
  };
}

export function assessPregnancyLogDraft(draft: PregnancyLogDraft): PregnancyLogAssessment {
  const soft: PregnancyIssue[] = [];

  if (!Number.isFinite(draft.kickCount) || draft.kickCount < 0) {
    return {
      hard: { code: 'kicks_negative', messageKey: 'unusualCheck' },
      soft: [],
      payload: null,
    };
  }

  const kickCount = Math.floor(draft.kickCount);
  if (kickCount > KICKS_SOFT_MAX) {
    soft.push({
      code: 'soft_kicks_high',
      messageKey: 'kicksHigh',
      params: { count: kickCount },
    });
  }

  const notes = draft.notes.trim();
  if (notes.length > NOTES_SOFT_MAX) {
    soft.push({
      code: 'soft_notes_long',
      messageKey: 'notesLong',
      params: { max: NOTES_SOFT_MAX },
    });
  }

  const mood = draft.mood && MOOD_SET.has(draft.mood) ? draft.mood : undefined;
  const symptoms = draft.symptoms.filter((item) => SYMPTOM_SET.has(item));

  if (!mood && symptoms.length === 0 && kickCount === 0 && !notes) {
    soft.push({ code: 'soft_empty_log', messageKey: 'emptyLog' });
  }

  return {
    hard: null,
    soft,
    payload: {
      dateKey: draft.dateKey,
      mood,
      symptoms,
      kickCount,
      notes,
    },
  };
}
