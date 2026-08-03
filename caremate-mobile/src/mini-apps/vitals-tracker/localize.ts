import type { BloodSugarContext, VitalType, VitalUnit } from '@/mini-apps/vitals-tracker/constants';
import { BLOOD_SUGAR_CONTEXTS, VITAL_TYPES } from '@/mini-apps/vitals-tracker/constants';
import type { TranslateFn } from '@/mini-apps/_kit/i18n';
import { unitLabel } from '@/mini-apps/vitals-tracker/utils';

export function localizeVitalType(type: VitalType, t: TranslateFn): string {
  return t(`apps.vitals.types.${type}`);
}

export function localizeVitalTypeOptions(t: TranslateFn): { id: VitalType; label: string }[] {
  return VITAL_TYPES.map((id) => ({
    id,
    label: localizeVitalType(id, t),
  }));
}

export function localizeUnitChip(unit: VitalUnit, t: TranslateFn): string {
  const key = `apps.vitals.units.${unit}`;
  const translated = t(key);
  if (translated === key) {
    return unitLabel(unit);
  }
  return translated;
}

export function localizeBloodSugarContext(context: BloodSugarContext, t: TranslateFn): string {
  return t(`apps.vitals.bloodSugarContext.${context}`);
}

export function localizeBloodSugarContextOptions(
  t: TranslateFn,
): { id: BloodSugarContext; label: string }[] {
  return BLOOD_SUGAR_CONTEXTS.map((id) => ({
    id,
    label: localizeBloodSugarContext(id, t),
  }));
}
