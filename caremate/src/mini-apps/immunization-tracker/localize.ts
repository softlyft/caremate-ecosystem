import type { VaccineDefinition } from '@/mini-apps/immunization-tracker/constants';
import type { TranslateFn } from '@/mini-apps/_kit/i18n';
import type { VaccineStatus } from '@/mini-apps/immunization-tracker/utils';

export function localizeVaccine(vaccine: VaccineDefinition, t: TranslateFn): VaccineDefinition {
  return {
    ...vaccine,
    name: t(`apps.immunization.schedule.${vaccine.id}.name`) || vaccine.name,
    doseLabel: t(`apps.immunization.schedule.${vaccine.id}.doseLabel`) || vaccine.doseLabel,
    description: t(`apps.immunization.schedule.${vaccine.id}.description`) || vaccine.description,
  };
}

export function localizeVaccineStatus(status: VaccineStatus, t: TranslateFn): string {
  return t(`apps.immunization.status.${status}`);
}
