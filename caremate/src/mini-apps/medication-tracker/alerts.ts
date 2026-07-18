import { createInAppNotification } from '@/domains/notifications/service';
import type { NotificationSeverity } from '@/domains/notifications/types';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import {
  buildDaySlots,
  needsRefill,
  type Medication,
  type MedicationDoseLog,
} from '@/mini-apps/medication-tracker/utils';

export type MedicationAlertCandidate = {
  eventType: 'dose_due' | 'dose_missed' | 'refill_due';
  dedupeKey: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  entityId: string;
};

export type MedicationAlertCopy = {
  doseDueTitle: (name: string) => string;
  doseDueBody: (name: string, slotLabel: string) => string;
  doseMissedTitle: (name: string) => string;
  doseMissedBody: (name: string, slotLabel: string) => string;
  refillTitle: (name: string) => string;
  refillBody: (name: string) => string;
};

const DEFAULT_COPY: MedicationAlertCopy = {
  doseDueTitle: (name) => `Dose due: ${name}`,
  doseDueBody: (name, slotLabel) =>
    `${name} — ${slotLabel} is due. Mark it taken in Medication Assistant.`,
  doseMissedTitle: (name) => `Missed dose: ${name}`,
  doseMissedBody: (name, slotLabel) => `${name} — ${slotLabel} was missed. Catch up when you can.`,
  refillTitle: (name) => `Refill soon: ${name}`,
  refillBody: (name) => `${name} is running low or due for a refill.`,
};

/** Pure collector used by tests and the async evaluator. */
export function collectMedicationAlerts(params: {
  medications: Medication[];
  logs: MedicationDoseLog[];
  now?: Date;
  copy?: MedicationAlertCopy;
}): MedicationAlertCandidate[] {
  const now = params.now ?? new Date();
  const todayKey = toDateKey(now);
  const copy = params.copy ?? DEFAULT_COPY;
  const candidates: MedicationAlertCandidate[] = [];

  const active = params.medications.filter((medication) => medication.active);
  const slots = buildDaySlots(active, params.logs, todayKey, now);

  for (const slot of slots) {
    if (slot.status === 'due') {
      candidates.push({
        eventType: 'dose_due',
        dedupeKey: `med:dose:${slot.medication.id}:${slot.dateKey}:${slot.slotIndex}`,
        title: copy.doseDueTitle(slot.medication.name),
        body: copy.doseDueBody(slot.medication.name, slot.slotLabel),
        severity: 'important',
        entityId: slot.medication.id,
      });
    }
    if (slot.status === 'missed') {
      candidates.push({
        eventType: 'dose_missed',
        dedupeKey: `med:missed:${slot.medication.id}:${slot.dateKey}:${slot.slotIndex}`,
        title: copy.doseMissedTitle(slot.medication.name),
        body: copy.doseMissedBody(slot.medication.name, slot.slotLabel),
        severity: 'critical',
        entityId: slot.medication.id,
      });
    }
  }

  for (const medication of active) {
    if (!needsRefill(medication, todayKey)) {
      continue;
    }
    candidates.push({
      eventType: 'refill_due',
      dedupeKey: `med:refill:${medication.id}:${medication.refillDueDate ?? 'qty'}`,
      title: copy.refillTitle(medication.name),
      body: copy.refillBody(medication.name),
      severity: 'important',
      entityId: medication.id,
    });
  }

  return candidates;
}

/** Best-effort inbox write. Never throws to callers. */
export async function evaluateMedicationAlerts(params: {
  userId: string;
  medications: Medication[];
  logs: MedicationDoseLog[];
  notificationsEnabled: boolean;
  now?: Date;
  copy?: MedicationAlertCopy;
}): Promise<number> {
  if (!params.notificationsEnabled || !params.userId) {
    return 0;
  }

  const candidates = collectMedicationAlerts({
    medications: params.medications,
    logs: params.logs,
    now: params.now,
    copy: params.copy,
  });

  let written = 0;
  for (const candidate of candidates) {
    try {
      await createInAppNotification({
        userId: params.userId,
        domain: 'medication',
        eventType: candidate.eventType,
        title: candidate.title,
        body: candidate.body,
        severity: candidate.severity,
        entityType: 'medication',
        entityId: candidate.entityId,
        dedupeKey: candidate.dedupeKey,
      });
      written += 1;
    } catch {
      // Inbox must never break medication flows.
    }
  }
  return written;
}
