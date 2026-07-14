import {
  CHECKUP_CATALOG,
  getCadenceIntervalYears,
  getCadenceLabel,
  type CheckupDefinition,
  type CheckupGenderFilter,
} from '@/mini-apps/checkup-planner/constants';
import { INTERNATIONAL_COUNTRY_CODE } from '@/constants/locations';
import { parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

export type PlannerGender = 'female' | 'male' | 'other';

export interface CheckupPlannerProfile {
  dateOfBirth: string;
  gender: PlannerGender;
  /** ISO country code, or null to use INT */
  regionCode: string | null;
}

export interface CheckupCompletion {
  checkupId: string;
  /** Calendar year the checkup was completed for */
  year: number;
  completedDate: string;
  notes?: string;
}

export type CheckupItemStatus = 'completed' | 'due' | 'overdue' | 'upcoming';

export interface CheckupYearItem {
  checkup: CheckupDefinition;
  year: number;
  status: CheckupItemStatus;
  ageInYear: number;
  completion?: CheckupCompletion;
}

export function formatDisplayDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getAgeOnDate(dateOfBirth: string, reference: Date): number {
  const dob = parseDateKey(dateOfBirth);
  let age = reference.getFullYear() - dob.getFullYear();
  const monthDiff = reference.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < dob.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

/** Age reached by Dec 31 of the given calendar year. */
export function getAgeInYear(dateOfBirth: string, year: number): number {
  return getAgeOnDate(dateOfBirth, new Date(year, 11, 31));
}

export function resolvePlannerRegion(regionCode: string | null | undefined): string {
  const code = regionCode?.trim().toUpperCase();
  return code || INTERNATIONAL_COUNTRY_CODE;
}

function matchesGender(filter: CheckupGenderFilter, gender: PlannerGender): boolean {
  if (filter === 'all') {
    return true;
  }
  if (gender === 'other') {
    // Show shared + both sex-specific items so nothing critical is hidden.
    return true;
  }
  return filter === gender;
}

function matchesRegion(checkup: CheckupDefinition, regionCode: string): boolean {
  if (!checkup.regions || checkup.regions.length === 0) {
    return true;
  }
  if (regionCode === INTERNATIONAL_COUNTRY_CODE) {
    // Region-specific tips stay hidden on pure INT unless they're universal.
    return false;
  }
  return checkup.regions.includes(regionCode);
}

function isAgeEligible(checkup: CheckupDefinition, age: number): boolean {
  if (age < checkup.minAge) {
    return false;
  }
  if (typeof checkup.maxAge === 'number' && age > checkup.maxAge) {
    return false;
  }
  return true;
}

function findLatestCompletion(
  checkupId: string,
  completions: CheckupCompletion[],
  atOrBeforeYear: number,
): CheckupCompletion | undefined {
  return completions
    .filter((item) => item.checkupId === checkupId && item.year <= atOrBeforeYear)
    .sort((a, b) => b.year - a.year)[0];
}

function isDueInYear(
  checkup: CheckupDefinition,
  year: number,
  age: number,
  completions: CheckupCompletion[],
): boolean {
  const yearCompletion = completions.find(
    (item) => item.checkupId === checkup.id && item.year === year,
  );
  if (yearCompletion) {
    return false;
  }

  const interval = getCadenceIntervalYears(checkup.cadence);

  if (checkup.cadence === 'once') {
    const anyPrior = completions.some((item) => item.checkupId === checkup.id);
    if (anyPrior) {
      return false;
    }
    // First due in the year they reach minAge; remains due afterward until logged.
    return age >= checkup.minAge;
  }

  if (interval <= 1) {
    return true;
  }

  const latest = findLatestCompletion(checkup.id, completions, year);
  if (!latest) {
    // First occurrence in the year they become eligible.
    return age >= checkup.minAge;
  }

  return year - latest.year >= interval;
}

export function buildYearSchedule(
  profile: CheckupPlannerProfile,
  completions: CheckupCompletion[],
  year: number,
): CheckupYearItem[] {
  const region = resolvePlannerRegion(profile.regionCode);
  const age = getAgeInYear(profile.dateOfBirth, year);
  const currentYear = new Date().getFullYear();

  const items: CheckupYearItem[] = [];

  for (const checkup of CHECKUP_CATALOG) {
    if (!matchesGender(checkup.gender, profile.gender)) {
      continue;
    }
    if (!matchesRegion(checkup, region)) {
      continue;
    }

    const completion = completions.find(
      (item) => item.checkupId === checkup.id && item.year === year,
    );

    if (completion) {
      items.push({
        checkup,
        year,
        status: 'completed',
        ageInYear: age,
        completion,
      });
      continue;
    }

    // Not yet age-eligible this year → only show if they will become eligible this year
    // (age at year-end >= minAge) OR already eligible; hide future-only items for cleaner "due" lists.
    if (!isAgeEligible(checkup, age)) {
      // Show as upcoming if they turn eligible within 1 year of this planning year.
      const ageNext = age + 1;
      if (isAgeEligible(checkup, ageNext) && year >= currentYear) {
        items.push({
          checkup,
          year,
          status: 'upcoming',
          ageInYear: age,
        });
      }
      continue;
    }

    if (!isDueInYear(checkup, year, age, completions)) {
      continue;
    }

    let status: CheckupItemStatus = 'due';
    if (year < currentYear) {
      status = 'overdue';
    } else if (year > currentYear) {
      status = 'upcoming';
    }

    items.push({
      checkup,
      year,
      status,
      ageInYear: age,
    });
  }

  const order: Record<CheckupItemStatus, number> = {
    overdue: 0,
    due: 1,
    upcoming: 2,
    completed: 3,
  };

  return items.sort((a, b) => {
    const statusDiff = order[a.status] - order[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return a.checkup.name.localeCompare(b.checkup.name);
  });
}

export function getYearSummary(items: CheckupYearItem[]) {
  const completed = items.filter((item) => item.status === 'completed').length;
  const due = items.filter((item) => item.status === 'due').length;
  const overdue = items.filter((item) => item.status === 'overdue').length;
  const upcoming = items.filter((item) => item.status === 'upcoming').length;
  const actionable = due + overdue;
  const total = items.length;
  const progress = total > 0 ? completed / total : 0;

  return { completed, due, overdue, upcoming, actionable, total, progress };
}

export function getStatusLabel(status: CheckupItemStatus): string {
  switch (status) {
    case 'completed':
      return 'Done';
    case 'due':
      return 'Due';
    case 'overdue':
      return 'Overdue';
    case 'upcoming':
      return 'Upcoming';
  }
}

export { getCadenceLabel, toDateKey, CHECKUP_CATALOG };
