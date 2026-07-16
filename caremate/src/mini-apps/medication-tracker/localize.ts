import {
  FREQUENCY_OPTIONS,
  type MedicationFrequency,
} from '@/mini-apps/medication-tracker/constants';
import type { TranslateFn } from '@/mini-apps/_kit/i18n';
import type { DoseSlot, DoseSlotStatus, Medication } from '@/mini-apps/medication-tracker/utils';

export function localizeFrequencyLabel(frequency: MedicationFrequency, t: TranslateFn): string {
  return t(`apps.medication.frequency.${frequency}.label`);
}

export function localizeFrequencyOptions(t: TranslateFn) {
  return FREQUENCY_OPTIONS.map((option) => ({
    ...option,
    label: localizeFrequencyLabel(option.id, t),
    slotLabels: option.slotLabels.map(
      (_, index) =>
        t(`apps.medication.frequency.${option.id}.slots.${index}`) || option.slotLabels[index],
    ),
  }));
}

export function localizeSlotLabel(
  frequency: MedicationFrequency,
  slotIndex: number,
  t: TranslateFn,
  fallback?: string,
): string {
  return t(`apps.medication.frequency.${frequency}.slots.${slotIndex}`) || fallback || '';
}

export function localizeDoseSlotLabel(slot: DoseSlot, t: TranslateFn): string {
  if (slot.medication.frequency === 'as-needed') {
    if (slot.status === 'taken' && slot.slotIndex > 0) {
      return t('apps.medication.ui.doseN', { n: slot.slotIndex + 1 });
    }
    return t('apps.medication.frequency.as-needed.label');
  }
  return localizeSlotLabel(slot.medication.frequency, slot.slotIndex, t, slot.slotLabel);
}

export function localizeMedicationStatus(status: DoseSlotStatus, t: TranslateFn): string {
  return t(`apps.medication.status.${status}`);
}

export function localizeMedicationPatient(medication: Medication, t: TranslateFn): string {
  if (medication.forKid) {
    return medication.patientName?.trim() || t('apps.medication.ui.child');
  }
  return t('apps.medication.ui.you');
}
