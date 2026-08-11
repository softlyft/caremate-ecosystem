/**
 * Hard / soft validation for Pregnancy Tracker setup + daily log.
 */

import {
  MOOD_OPTIONS,
  PREGNANCY_DAYS,
  SYMPTOM_OPTIONS,
} from '@/mini-apps/pregnancy-tracker/constants';
import {
  daysSincePreviousTtDose,
  getMaternalTtDose,
  getNextMaternalTtDoseId,
  getPreviousMaternalTtDoseId,
  MATERNAL_TT_MIN_INTERVAL_DAYS,
  type MaternalTtDose,
  type MaternalTtDoseId,
} from '@/mini-apps/pregnancy-tracker/maternal-tt';
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
  | 'kicks_negative'
  | 'soft_weight_unusual'
  | 'weight_invalid'
  | 'soft_overwrite_timeline'
  | 'soft_start_new_after_ended'
  | 'tt_future'
  | 'tt_out_of_order'
  | 'soft_tt_interval'
  | 'soft_tt_before_previous'
  | 'birth_future'
  | 'soft_birth_before_lmp'
  | 'setup_blocked_postpartum';

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
  /** Active pregnancy already has LMP/due date set. */
  hasActiveTimeline?: boolean;
  /** Previous pregnancy was ended; next save starts a fresh pregnancy. */
  previouslyEnded?: boolean;
  /** Block new pregnancy setup while mother postpartum care is active. */
  isPostpartum?: boolean;
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
  weightKg?: number | null;
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
    weightKg?: number;
  } | null;
};

export const NICKNAME_SOFT_MAX = 40;
export const KICKS_SOFT_MAX = 50;
export const NOTES_SOFT_MAX = 500;
export const WEIGHT_SOFT_MIN_KG = 35;
export const WEIGHT_SOFT_MAX_KG = 200;
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

  if (draft.isPostpartum) {
    return {
      hard: { code: 'setup_blocked_postpartum', messageKey: 'setupBlockedPostpartum' },
      soft: [],
      payload: null,
    };
  }

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

  if (draft.previouslyEnded) {
    soft.push({ code: 'soft_start_new_after_ended', messageKey: 'startNewAfterEnded' });
  } else if (draft.hasActiveTimeline) {
    soft.push({ code: 'soft_overwrite_timeline', messageKey: 'overwriteTimeline' });
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

  let weightKg: number | undefined;
  if (draft.weightKg != null) {
    const raw = draft.weightKg;
    if (!Number.isFinite(raw)) {
      return {
        hard: { code: 'weight_invalid', messageKey: 'unusualCheck' },
        soft: [],
        payload: null,
      };
    }
    weightKg = Math.round(raw * 10) / 10;
    if (weightKg < WEIGHT_SOFT_MIN_KG || weightKg > WEIGHT_SOFT_MAX_KG) {
      soft.push({
        code: 'soft_weight_unusual',
        messageKey: 'weightUnusual',
        params: { min: WEIGHT_SOFT_MIN_KG, max: WEIGHT_SOFT_MAX_KG, value: weightKg },
      });
    }
  }

  if (!mood && symptoms.length === 0 && kickCount === 0 && !notes && weightKg == null) {
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
      ...(weightKg != null ? { weightKg } : {}),
    },
  };
}

export type MaternalTtDraft = {
  doseId: MaternalTtDoseId;
  selectedDate: string | null;
  todayKey: string;
  existingDoses: MaternalTtDose[];
};

export type MaternalTtAssessment = {
  hard: PregnancyIssue | null;
  soft: PregnancyIssue[];
  payload: { doseId: MaternalTtDoseId; dateKey: string } | null;
};

export function assessMaternalTtDraft(draft: MaternalTtDraft): MaternalTtAssessment {
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

  if (draft.selectedDate > draft.todayKey) {
    return {
      hard: { code: 'tt_future', messageKey: 'ttFuture' },
      soft: [],
      payload: null,
    };
  }

  const alreadyLogged = Boolean(getMaternalTtDose(draft.existingDoses, draft.doseId));
  const nextId = getNextMaternalTtDoseId(draft.existingDoses);
  if (!alreadyLogged && draft.doseId !== nextId) {
    return {
      hard: {
        code: 'tt_out_of_order',
        messageKey: 'ttOutOfOrder',
        params: { dose: draft.doseId.toUpperCase(), next: (nextId ?? 'none').toUpperCase() },
      },
      soft: [],
      payload: null,
    };
  }

  const previousId = getPreviousMaternalTtDoseId(draft.doseId);
  if (previousId) {
    const previous = getMaternalTtDose(draft.existingDoses, previousId);
    if (!previous) {
      return {
        hard: {
          code: 'tt_out_of_order',
          messageKey: 'ttOutOfOrder',
          params: { dose: draft.doseId.toUpperCase(), next: previousId.toUpperCase() },
        },
        soft: [],
        payload: null,
      };
    }
    if (draft.selectedDate < previous.dateKey) {
      soft.push({
        code: 'soft_tt_before_previous',
        messageKey: 'ttBeforePrevious',
        params: { previous: previousId.toUpperCase(), previousDate: previous.dateKey },
      });
    }
    const gap = daysSincePreviousTtDose(
      draft.existingDoses,
      draft.doseId,
      draft.selectedDate,
    );
    if (gap != null && gap < MATERNAL_TT_MIN_INTERVAL_DAYS) {
      soft.push({
        code: 'soft_tt_interval',
        messageKey: 'ttIntervalShort',
        params: { days: MATERNAL_TT_MIN_INTERVAL_DAYS, gap },
      });
    }
  }

  return {
    hard: null,
    soft,
    payload: {
      doseId: draft.doseId,
      dateKey: draft.selectedDate,
    },
  };
}

export type BirthDraft = {
  selectedDate: string | null;
  todayKey: string;
  lastMenstrualPeriod: string | null;
};

export type BirthAssessment = {
  hard: PregnancyIssue | null;
  soft: PregnancyIssue[];
  payload: { birthDateKey: string } | null;
};

export function assessBirthDraft(draft: BirthDraft): BirthAssessment {
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

  if (draft.selectedDate > draft.todayKey) {
    return {
      hard: { code: 'birth_future', messageKey: 'birthFuture' },
      soft: [],
      payload: null,
    };
  }

  if (draft.lastMenstrualPeriod && draft.selectedDate < draft.lastMenstrualPeriod) {
    soft.push({
      code: 'soft_birth_before_lmp',
      messageKey: 'birthBeforeLmp',
    });
  }

  return {
    hard: null,
    soft,
    payload: { birthDateKey: draft.selectedDate },
  };
}
