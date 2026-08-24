/**
 * Hard / soft validation for Immunization Tracker dose logging.
 * Tone matches checkup/medication: block impossible values; confirm unusual ones.
 */

import {
  VACCINE_SCHEDULE,
  type VaccineDefinition,
} from '@/mini-apps/immunization-tracker/constants';
import {
  getRecommendedDate,
  type ImmunizationProfile,
  type ImmunizationRecord,
} from '@/mini-apps/immunization-tracker/utils';
import { daysBetween, parseDateKey } from '@/mini-apps/_kit/date-utils';

export type ImmunizationIssueCode =
  | 'required_profile'
  | 'invalid_vaccine'
  | 'required_administered_date'
  | 'invalid_administered_date'
  | 'administered_before_dob'
  | 'administered_future'
  | 'soft_far_from_recommended'
  | 'soft_very_early'
  | 'soft_series_out_of_order'
  | 'soft_provider_long'
  | 'soft_notes_long';

export type ImmunizationIssue = {
  code: ImmunizationIssueCode;
  /** i18n key under apps.immunization.validation.* */
  messageKey: string;
  params?: Record<string, string | number>;
};

export type ImmunizationRecordDraft = {
  profile: ImmunizationProfile | null | undefined;
  vaccineId: string;
  administeredDate: string | null;
  provider?: string;
  notes?: string;
  todayKey: string;
  /** Existing records for this child (series-order checks). */
  records: ImmunizationRecord[];
};

export type ImmunizationRecordAssessment = {
  hard: ImmunizationIssue | null;
  soft: ImmunizationIssue[];
  payload: {
    profileId: string;
    vaccineId: string;
    administeredDate: string;
    provider?: string;
    notes?: string;
  } | null;
};

export const FAR_FROM_RECOMMENDED_DAYS = 90;
export const VERY_EARLY_DAYS = 28;
export const PROVIDER_SOFT_MAX = 80;
export const NOTES_SOFT_MAX = 500;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string | null | undefined): boolean {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y == null || m == null || d == null) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Same-series vaccines share `name`, ordered by recommended age. */
export function getPriorDosesInSeries(vaccine: VaccineDefinition): VaccineDefinition[] {
  return VACCINE_SCHEDULE.filter(
    (item) =>
      item.name === vaccine.name &&
      item.id !== vaccine.id &&
      item.recommendedAgeWeeks < vaccine.recommendedAgeWeeks,
  ).sort((a, b) => a.recommendedAgeWeeks - b.recommendedAgeWeeks);
}

export function assessImmunizationRecordDraft(
  draft: ImmunizationRecordDraft,
): ImmunizationRecordAssessment {
  const soft: ImmunizationIssue[] = [];

  if (!draft.profile?.id || !draft.profile.dateOfBirth) {
    return {
      hard: { code: 'required_profile', messageKey: 'requiredProfile' },
      soft: [],
      payload: null,
    };
  }

  const vaccine = VACCINE_SCHEDULE.find((item) => item.id === draft.vaccineId);
  if (!vaccine) {
    return {
      hard: { code: 'invalid_vaccine', messageKey: 'invalidVaccine' },
      soft: [],
      payload: null,
    };
  }

  if (!draft.administeredDate) {
    return {
      hard: { code: 'required_administered_date', messageKey: 'requiredAdministeredDate' },
      soft: [],
      payload: null,
    };
  }

  if (!isValidDateKey(draft.administeredDate)) {
    return {
      hard: { code: 'invalid_administered_date', messageKey: 'unusualCheck' },
      soft: [],
      payload: null,
    };
  }

  if (!isValidDateKey(draft.profile.dateOfBirth)) {
    return {
      hard: { code: 'required_profile', messageKey: 'requiredProfile' },
      soft: [],
      payload: null,
    };
  }

  if (draft.administeredDate < draft.profile.dateOfBirth) {
    return {
      hard: { code: 'administered_before_dob', messageKey: 'administeredBeforeDob' },
      soft: [],
      payload: null,
    };
  }

  if (draft.administeredDate > draft.todayKey) {
    return {
      hard: { code: 'administered_future', messageKey: 'administeredFuture' },
      soft: [],
      payload: null,
    };
  }

  const recommendedDate = getRecommendedDate(
    draft.profile.dateOfBirth,
    vaccine.recommendedAgeWeeks,
  );
  const daysFromRecommended = daysBetween(
    parseDateKey(recommendedDate),
    parseDateKey(draft.administeredDate),
  );

  if (daysFromRecommended < -VERY_EARLY_DAYS) {
    soft.push({
      code: 'soft_very_early',
      messageKey: 'veryEarly',
      params: {
        recommended: recommendedDate,
        days: Math.abs(daysFromRecommended),
      },
    });
  } else if (Math.abs(daysFromRecommended) > FAR_FROM_RECOMMENDED_DAYS) {
    soft.push({
      code: 'soft_far_from_recommended',
      messageKey: 'farFromRecommended',
      params: {
        recommended: recommendedDate,
        days: Math.abs(daysFromRecommended),
      },
    });
  }

  const priorMissing = getPriorDosesInSeries(vaccine).filter(
    (prior) => !draft.records.some((record) => record.vaccineId === prior.id),
  );
  if (priorMissing.length > 0) {
    const firstMissing = priorMissing[0]!;
    soft.push({
      code: 'soft_series_out_of_order',
      messageKey: 'seriesOutOfOrder',
      params: {
        missing: `${firstMissing.name} ${firstMissing.doseLabel}`,
      },
    });
  }

  const provider = draft.provider?.trim() || undefined;
  const notes = draft.notes?.trim() || undefined;

  if (provider && provider.length > PROVIDER_SOFT_MAX) {
    soft.push({
      code: 'soft_provider_long',
      messageKey: 'providerLong',
      params: { max: PROVIDER_SOFT_MAX },
    });
  }

  if (notes && notes.length > NOTES_SOFT_MAX) {
    soft.push({
      code: 'soft_notes_long',
      messageKey: 'notesLong',
      params: { max: NOTES_SOFT_MAX },
    });
  }

  return {
    hard: null,
    soft,
    payload: {
      profileId: draft.profile.id,
      vaccineId: vaccine.id,
      administeredDate: draft.administeredDate,
      provider,
      notes,
    },
  };
}
