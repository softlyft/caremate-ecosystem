/**
 * Hard / soft validation for Checkup Planner profile + completion logging.
 * Tone matches vitals/medication: block impossible values; confirm unusual ones.
 */

import { CHECKUP_CATALOG, type CheckupDefinition } from '@/mini-apps/checkup-planner/constants';
import {
  getAgeOnDate,
  type CheckupCompletion,
  type CheckupPlannerProfile,
  type PlannerGender,
} from '@/mini-apps/checkup-planner/utils';

export type CheckupIssueCode =
  | 'required_gender'
  | 'required_dob'
  | 'dob_future'
  | 'invalid_checkup'
  | 'invalid_year'
  | 'invalid_completed_date'
  | 'completed_before_dob'
  | 'soft_age_high'
  | 'soft_age_young'
  | 'soft_completed_future'
  | 'soft_completed_year_mismatch'
  | 'soft_notes_long'
  | 'soft_once_already_logged';

export type CheckupIssue = {
  code: CheckupIssueCode;
  /** i18n key under apps.checkup.validation.* */
  messageKey: string;
  params?: Record<string, string | number>;
};

export type ProfileDraft = {
  dateOfBirth: string | null;
  gender: PlannerGender | null;
  regionCode: string | null;
  todayKey: string;
};

export type ProfileAssessment = {
  hard: CheckupIssue | null;
  soft: CheckupIssue[];
  payload: CheckupPlannerProfile | null;
};

export type CompletionDraft = {
  checkupId: string;
  year: number;
  completedDate: string;
  notes?: string;
  profile: CheckupPlannerProfile;
  todayKey: string;
  currentYear: number;
  /** Existing completions (for once-cadence soft warn). */
  completions: CheckupCompletion[];
  checkup?: CheckupDefinition;
};

export type CompletionAssessment = {
  hard: CheckupIssue | null;
  soft: CheckupIssue[];
  payload: {
    checkupId: string;
    year: number;
    completedDate: string;
    notes?: string;
  } | null;
};

export const AGE_SOFT_MAX = 120;
/** Soft-warn when younger than the youngest catalog item (dental at 5). */
export const AGE_SOFT_MIN = 5;
export const NOTES_SOFT_MAX = 500;
export const YEAR_RANGE_PAST = 5;
export const YEAR_RANGE_FUTURE = 1;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GENDERS: PlannerGender[] = ['female', 'male', 'other'];

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y == null || m == null || d == null) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function assessProfileDraft(draft: ProfileDraft): ProfileAssessment {
  const soft: CheckupIssue[] = [];

  if (!draft.gender || !GENDERS.includes(draft.gender)) {
    return {
      hard: { code: 'required_gender', messageKey: 'requiredGender' },
      soft: [],
      payload: null,
    };
  }

  if (!draft.dateOfBirth || !isValidDateKey(draft.dateOfBirth)) {
    return {
      hard: { code: 'required_dob', messageKey: 'requiredDob' },
      soft: [],
      payload: null,
    };
  }

  if (draft.dateOfBirth > draft.todayKey) {
    return {
      hard: { code: 'dob_future', messageKey: 'dobFuture' },
      soft: [],
      payload: null,
    };
  }

  const [ty, tm, td] = draft.todayKey.split('-').map(Number);
  const age = getAgeOnDate(
    draft.dateOfBirth,
    new Date(ty ?? 2000, (tm ?? 1) - 1, td ?? 1),
  );
  if (age > AGE_SOFT_MAX) {
    soft.push({
      code: 'soft_age_high',
      messageKey: 'ageHigh',
      params: { age },
    });
  } else if (age < AGE_SOFT_MIN) {
    soft.push({
      code: 'soft_age_young',
      messageKey: 'ageYoung',
      params: { age },
    });
  }

  const regionCode = draft.regionCode?.trim().toUpperCase() || null;

  return {
    hard: null,
    soft,
    payload: {
      dateOfBirth: draft.dateOfBirth,
      gender: draft.gender,
      regionCode,
    },
  };
}

export function assessCompletionDraft(draft: CompletionDraft): CompletionAssessment {
  const soft: CheckupIssue[] = [];
  const checkup =
    draft.checkup ?? CHECKUP_CATALOG.find((item) => item.id === draft.checkupId);

  if (!checkup) {
    return {
      hard: { code: 'invalid_checkup', messageKey: 'invalidCheckup' },
      soft: [],
      payload: null,
    };
  }

  const minYear = draft.currentYear - YEAR_RANGE_PAST;
  const maxYear = draft.currentYear + YEAR_RANGE_FUTURE;
  if (
    !Number.isFinite(draft.year) ||
    !Number.isInteger(draft.year) ||
    draft.year < minYear ||
    draft.year > maxYear
  ) {
    return {
      hard: { code: 'invalid_year', messageKey: 'invalidYear' },
      soft: [],
      payload: null,
    };
  }

  if (!isValidDateKey(draft.completedDate)) {
    return {
      hard: { code: 'invalid_completed_date', messageKey: 'unusualCheck' },
      soft: [],
      payload: null,
    };
  }

  if (draft.completedDate < draft.profile.dateOfBirth) {
    return {
      hard: { code: 'completed_before_dob', messageKey: 'completedBeforeDob' },
      soft: [],
      payload: null,
    };
  }

  if (draft.completedDate > draft.todayKey) {
    soft.push({ code: 'soft_completed_future', messageKey: 'completedFuture' });
  }

  const completedYear = Number(draft.completedDate.slice(0, 4));
  if (Number.isFinite(completedYear) && completedYear !== draft.year) {
    soft.push({
      code: 'soft_completed_year_mismatch',
      messageKey: 'completedYearMismatch',
      params: { completedYear, planYear: draft.year },
    });
  }

  const notes = draft.notes?.trim() || undefined;
  if (notes && notes.length > NOTES_SOFT_MAX) {
    soft.push({
      code: 'soft_notes_long',
      messageKey: 'notesLong',
      params: { max: NOTES_SOFT_MAX },
    });
  }

  if (checkup.cadence === 'once') {
    const prior = draft.completions.find(
      (item) => item.checkupId === checkup.id && item.year !== draft.year,
    );
    if (prior) {
      soft.push({
        code: 'soft_once_already_logged',
        messageKey: 'onceAlreadyLogged',
        params: { year: prior.year },
      });
    }
  }

  return {
    hard: null,
    soft,
    payload: {
      checkupId: checkup.id,
      year: draft.year,
      completedDate: draft.completedDate,
      notes,
    },
  };
}
