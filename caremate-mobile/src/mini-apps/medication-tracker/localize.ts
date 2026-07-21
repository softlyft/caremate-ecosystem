import {
  FREQUENCY_OPTIONS,
  INSTRUCTION_KINDS,
  type MedicationFrequency,
  type MedicationInstructionKind,
} from '@/mini-apps/medication-tracker/constants';
import type { TranslateFn } from '@/mini-apps/_kit/i18n';
import type {
  DoseSlot,
  DoseSlotStatus,
  Medication,
  MedicationInstructions,
} from '@/mini-apps/medication-tracker/utils';
import type { MedicationAlertCopy } from '@/mini-apps/medication-tracker/alerts';

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
  const base = localizeSlotLabel(slot.medication.frequency, slot.slotIndex, t, slot.slotLabel);
  return slot.slotTime ? `${base} · ${slot.slotTime}` : base;
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

export function localizeInstructionKind(kind: MedicationInstructionKind, t: TranslateFn): string {
  return t(`apps.medication.instructions.${kind}`);
}

export function localizeInstructionOptions(t: TranslateFn) {
  return INSTRUCTION_KINDS.map((kind) => ({
    id: kind,
    label: localizeInstructionKind(kind, t),
  }));
}

export function localizeInstructionsSummary(
  instructions: MedicationInstructions,
  t: TranslateFn,
): string | null {
  if (instructions.kind === 'none') {
    return instructions.text?.trim() || null;
  }
  if (instructions.kind === 'other') {
    return instructions.text?.trim() || localizeInstructionKind('other', t);
  }
  return localizeInstructionKind(instructions.kind, t);
}

export function buildMedicationAlertCopy(t: TranslateFn): MedicationAlertCopy {
  return {
    doseDueTitle: (name) => t('apps.medication.alerts.doseDueTitle', { name }),
    doseDueBody: (name, slotLabel) =>
      t('apps.medication.alerts.doseDueBody', { name, slot: slotLabel }),
    doseMissedTitle: (name) => t('apps.medication.alerts.doseMissedTitle', { name }),
    doseMissedBody: (name, slotLabel) =>
      t('apps.medication.alerts.doseMissedBody', { name, slot: slotLabel }),
    refillTitle: (name) => t('apps.medication.alerts.refillTitle', { name }),
    refillBody: (name) => t('apps.medication.alerts.refillBody', { name }),
  };
}
