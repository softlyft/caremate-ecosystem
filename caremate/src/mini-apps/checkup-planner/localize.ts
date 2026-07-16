import type { CheckupCadence, CheckupDefinition } from '@/mini-apps/checkup-planner/constants';
import { GENDER_OPTIONS } from '@/mini-apps/checkup-planner/constants';
import type { TranslateFn } from '@/mini-apps/_kit/i18n';
import type { CheckupItemStatus } from '@/mini-apps/checkup-planner/utils';
import type { PlannerGender } from '@/mini-apps/checkup-planner/store';

export function localizeCheckupName(checkupId: string, t: TranslateFn, fallback?: string): string {
  return t(`apps.checkup.catalog.${checkupId}.name`) || fallback || checkupId;
}

export function localizeCheckupDescription(
  checkupId: string,
  t: TranslateFn,
  fallback?: string,
): string {
  return t(`apps.checkup.catalog.${checkupId}.description`) || fallback || '';
}

export function localizeCheckup(checkup: CheckupDefinition, t: TranslateFn): CheckupDefinition {
  return {
    ...checkup,
    name: localizeCheckupName(checkup.id, t, checkup.name),
    description: localizeCheckupDescription(checkup.id, t, checkup.description),
  };
}

export function localizeCadence(cadence: CheckupCadence, t: TranslateFn): string {
  return t(`apps.checkup.cadence.${cadence}`);
}

export function localizeGender(gender: PlannerGender, t: TranslateFn): string {
  return t(`apps.checkup.gender.${gender}`);
}

export function localizeGenderOptions(t: TranslateFn) {
  return GENDER_OPTIONS.map((option) => ({
    ...option,
    label: localizeGender(option.id, t),
  }));
}

export function localizeCheckupStatus(status: CheckupItemStatus, t: TranslateFn): string {
  return t(`apps.checkup.status.${status}`);
}
