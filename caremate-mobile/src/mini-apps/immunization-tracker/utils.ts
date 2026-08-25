import { VACCINE_SCHEDULE, VaccineDefinition } from '@/mini-apps/immunization-tracker/constants';
import { addDays, daysBetween, parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

export type VaccineStatus = 'completed' | 'overdue' | 'due-soon' | 'upcoming';

export interface ImmunizationProfile {
  id: string;
  name: string;
  dateOfBirth: string;
}

export interface ImmunizationRecord {
  profileId: string;
  vaccineId: string;
  administeredDate: string;
  notes?: string;
  provider?: string;
}

export interface VaccineScheduleItem {
  vaccine: VaccineDefinition;
  recommendedDate: string;
  status: VaccineStatus;
  record?: ImmunizationRecord;
  daysUntilDue: number;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when a profile is safe to build a schedule from (avoids null `.split` on DOB). */
export function isValidImmunizationProfile(
  profile: ImmunizationProfile | null | undefined,
): profile is ImmunizationProfile {
  if (!profile || typeof profile !== 'object') {
    return false;
  }
  if (typeof profile.id !== 'string' || !profile.id.trim()) {
    return false;
  }
  if (typeof profile.name !== 'string' || !profile.name.trim()) {
    return false;
  }
  if (typeof profile.dateOfBirth !== 'string' || !DATE_KEY_RE.test(profile.dateOfBirth)) {
    return false;
  }
  const dob = parseDateKey(profile.dateOfBirth);
  return Number.isFinite(dob.getTime());
}

export function normalizeImmunizationProfiles(
  profiles: ImmunizationProfile[] | null | undefined,
): ImmunizationProfile[] {
  if (!Array.isArray(profiles)) {
    return [];
  }
  return profiles.filter(isValidImmunizationProfile).map((profile) => ({
    id: profile.id.trim(),
    name: profile.name.trim(),
    dateOfBirth: profile.dateOfBirth,
  }));
}

export function normalizeImmunizationRecords(
  records: ImmunizationRecord[] | null | undefined,
): ImmunizationRecord[] {
  if (!Array.isArray(records)) {
    return [];
  }
  return records.filter(
    (record) =>
      record &&
      typeof record === 'object' &&
      typeof record.profileId === 'string' &&
      record.profileId.trim() &&
      typeof record.vaccineId === 'string' &&
      record.vaccineId.trim() &&
      typeof record.administeredDate === 'string' &&
      DATE_KEY_RE.test(record.administeredDate),
  );
}

export function getRecommendedDate(dateOfBirth: string, recommendedAgeWeeks: number): string {
  return toDateKey(addDays(parseDateKey(dateOfBirth), recommendedAgeWeeks * 7));
}

export function formatDisplayDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getAgeLabel(dateOfBirth: string, referenceDate = new Date()): string {
  const totalDays = Math.max(0, daysBetween(parseDateKey(dateOfBirth), referenceDate));
  const weeks = Math.floor(totalDays / 7);
  const months = Math.floor(totalDays / 30.44);

  if (months >= 24) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}y ${remainingMonths}mo` : `${years} years`;
  }
  if (months >= 1) {
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

function getVaccineStatus(
  recommendedDate: string,
  hasRecord: boolean,
  referenceDate = new Date(),
): VaccineStatus {
  if (hasRecord) {
    return 'completed';
  }

  const daysUntil = daysBetween(referenceDate, parseDateKey(recommendedDate));
  if (daysUntil < 0) {
    return 'overdue';
  }
  if (daysUntil <= 14) {
    return 'due-soon';
  }
  return 'upcoming';
}

export function buildSchedule(
  profile: ImmunizationProfile,
  records: ImmunizationRecord[],
  referenceDate = new Date(),
): VaccineScheduleItem[] {
  if (!isValidImmunizationProfile(profile)) {
    return [];
  }

  const safeRecords = normalizeImmunizationRecords(records);
  const recordMap = new Map(safeRecords.map((record) => [record.vaccineId, record]));

  return VACCINE_SCHEDULE.map((vaccine) => {
    const recommendedDate = getRecommendedDate(profile.dateOfBirth, vaccine.recommendedAgeWeeks);
    const record = recordMap.get(vaccine.id);
    const daysUntilDue = daysBetween(referenceDate, parseDateKey(recommendedDate));

    return {
      vaccine,
      recommendedDate,
      status: getVaccineStatus(recommendedDate, Boolean(record), referenceDate),
      record,
      daysUntilDue,
    };
  });
}

export function getScheduleSummary(schedule: VaccineScheduleItem[]) {
  const completed = schedule.filter((item) => item.status === 'completed').length;
  const overdue = schedule.filter((item) => item.status === 'overdue').length;
  const dueSoon = schedule.filter((item) => item.status === 'due-soon').length;
  const upcoming = schedule.filter((item) => item.status === 'upcoming').length;
  const nextDue = schedule.find((item) => item.status === 'overdue' || item.status === 'due-soon');

  return {
    total: schedule.length,
    completed,
    overdue,
    dueSoon,
    upcoming,
    nextDue,
    progress: schedule.length > 0 ? completed / schedule.length : 0,
  };
}

export function getStatusLabel(status: VaccineStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'overdue':
      return 'Overdue';
    case 'due-soon':
      return 'Due soon';
    case 'upcoming':
      return 'Upcoming';
  }
}

export { toDateKey };
