import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { allowsOsNotifications } from '@/domains/notifications/push';
import { addDays, parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';
import { getFrequencyOption, MISSED_GRACE_MINUTES } from '@/mini-apps/medication-tracker/constants';
import type { MedicationAlertCopy } from '@/mini-apps/medication-tracker/alerts';
import {
  hhMmToDate,
  isMedicationScheduledOnDate,
  resolveSlotTimes,
  type Medication,
  type MedicationDoseLog,
} from '@/mini-apps/medication-tracker/utils';

export const MEDICATION_NOTIFICATION_PREFIX = 'med:';
export const MEDICATION_TRACKER_PATH = '/(app)/apps/medication-tracker';
const DEFAULT_HORIZON_DAYS = 3;
const REFILL_REMINDER_HOUR = 9;

export type MedicationScheduledNotification = {
  identifier: string;
  triggerAt: Date;
  eventType: 'dose_due' | 'dose_missed' | 'refill_due';
  title: string;
  body: string;
  medicationId: string;
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

function hasDoseLog(
  logs: MedicationDoseLog[],
  medicationId: string,
  dateKey: string,
  slotIndex: number,
): boolean {
  return logs.some(
    (log) =>
      log.medicationId === medicationId && log.dateKey === dateKey && log.slotIndex === slotIndex,
  );
}

/** Pure planner for local OS notifications — used by tests and the async scheduler. */
export function collectMedicationScheduledNotifications(params: {
  medications: Medication[];
  logs: MedicationDoseLog[];
  now?: Date;
  horizonDays?: number;
  copy?: MedicationAlertCopy;
}): MedicationScheduledNotification[] {
  const now = params.now ?? new Date();
  const horizonDays = params.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const copy = params.copy ?? DEFAULT_COPY;
  const planned: MedicationScheduledNotification[] = [];
  const seen = new Set<string>();

  const push = (item: MedicationScheduledNotification) => {
    if (seen.has(item.identifier) || item.triggerAt.getTime() <= now.getTime()) {
      return;
    }
    seen.add(item.identifier);
    planned.push(item);
  };

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = addDays(now, offset);
    const dateKey = toDateKey(day);

    for (const medication of params.medications.filter((item) => item.active)) {
      if (!isMedicationScheduledOnDate(medication, dateKey)) {
        continue;
      }

      const option = getFrequencyOption(medication.frequency);
      if (option.dosesPerDay === 0) {
        continue;
      }

      const slotTimes = resolveSlotTimes(medication);
      for (let slotIndex = 0; slotIndex < option.dosesPerDay; slotIndex += 1) {
        if (hasDoseLog(params.logs, medication.id, dateKey, slotIndex)) {
          continue;
        }

        const slotTime = slotTimes[slotIndex] ?? '08:00';
        const slotLabel = option.slotLabels[slotIndex] ?? `Dose ${slotIndex + 1}`;
        const dueAt = hhMmToDate(slotTime, parseDateKey(dateKey));
        const missedAt = new Date(dueAt.getTime() + MISSED_GRACE_MINUTES * 60_000);

        push({
          identifier: `med:dose:${medication.id}:${dateKey}:${slotIndex}`,
          triggerAt: dueAt,
          eventType: 'dose_due',
          title: copy.doseDueTitle(medication.name),
          body: copy.doseDueBody(medication.name, slotLabel),
          medicationId: medication.id,
        });

        push({
          identifier: `med:missed:${medication.id}:${dateKey}:${slotIndex}`,
          triggerAt: missedAt,
          eventType: 'dose_missed',
          title: copy.doseMissedTitle(medication.name),
          body: copy.doseMissedBody(medication.name, slotLabel),
          medicationId: medication.id,
        });
      }

      if (
        offset === 0 &&
        medication.refillDueDate &&
        medication.refillDueDate >= dateKey &&
        medication.refillDueDate <= toDateKey(addDays(now, horizonDays - 1))
      ) {
        const refillAt = hhMmToDate(
          `${String(REFILL_REMINDER_HOUR).padStart(2, '0')}:00`,
          parseDateKey(medication.refillDueDate),
        );
        push({
          identifier: `med:refill:${medication.id}:${medication.refillDueDate}`,
          triggerAt: refillAt,
          eventType: 'refill_due',
          title: copy.refillTitle(medication.name),
          body: copy.refillBody(medication.name),
          medicationId: medication.id,
        });
      }
    }
  }

  return planned.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
}

async function ensureMedicationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync('medications', {
    name: 'Medication reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** Schedules local OS notifications for upcoming doses. Best-effort; never throws. */
export async function syncMedicationScheduledNotifications(params: {
  medications: Medication[];
  logs: MedicationDoseLog[];
  notificationsEnabled: boolean;
  now?: Date;
  copy?: MedicationAlertCopy;
}): Promise<number> {
  if (!params.notificationsEnabled) {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const medicationIds = scheduled
        .map((item) => item.identifier)
        .filter((identifier) => identifier.startsWith(MEDICATION_NOTIFICATION_PREFIX));
      await Promise.all(
        medicationIds.map((identifier) =>
          Notifications.cancelScheduledNotificationAsync(identifier),
        ),
      );
    } catch {
      // Best-effort cleanup.
    }
    return 0;
  }

  try {
    const settings = await Notifications.getPermissionsAsync();
    if (!allowsOsNotifications(settings)) {
      return 0;
    }

    await ensureMedicationChannel();

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .map((item) => item.identifier)
        .filter((identifier) => identifier.startsWith(MEDICATION_NOTIFICATION_PREFIX))
        .map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
    );

    const planned = collectMedicationScheduledNotifications(params);
    for (const item of planned) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: {
          title: item.title,
          body: item.body,
          sound: 'default',
          data: {
            domain: 'medication',
            eventType: item.eventType,
            medicationId: item.medicationId,
            path: MEDICATION_TRACKER_PATH,
          },
          ...(Platform.OS === 'android' ? { channelId: 'medications' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.triggerAt,
        },
      });
    }

    return planned.length;
  } catch {
    return 0;
  }
}
