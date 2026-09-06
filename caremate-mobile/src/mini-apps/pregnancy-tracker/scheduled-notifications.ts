import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { allowsOsNotifications } from '@/domains/notifications/push';
import type { PregnancyAlertCopy } from '@/mini-apps/pregnancy-tracker/alerts';
import {
  getMaternalTtForecastDateKey,
  getNextMaternalTtDoseId,
  type MaternalTtDose,
} from '@/mini-apps/pregnancy-tracker/maternal-tt';
import { addDays, parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

export const MATERNAL_TT_NOTIFICATION_PREFIX = 'pregnancy-tt:';
export const MATERNAL_TT_TRACKER_PATH = '/(app)/apps/pregnancy-tracker/tt';
const DEFAULT_HORIZON_WEEKS = 12;
const REMINDER_HOUR = 9;

export type MaternalTtScheduledNotification = {
  identifier: string;
  triggerAt: Date;
  title: string;
  body: string;
  doseId: string;
};

const DEFAULT_COPY: Pick<PregnancyAlertCopy, 'ttDoseDueTitle' | 'ttDoseDueBody'> = {
  ttDoseDueTitle: (dose) => `${dose} may be due`,
  ttDoseDueBody: (dose) =>
    `Your clinic schedule suggests ${dose} from today. Log it in Pregnancy Tracker when you receive the shot.`,
};

function atLocalHour(date: Date, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
}

/**
 * Weekly local OS reminders from the next-dose forecast date while that dose is open.
 * Pure planner for tests + syncMaternalTtScheduledNotifications.
 */
export function collectMaternalTtScheduledNotifications(params: {
  maternalTtDoses: MaternalTtDose[];
  now?: Date;
  horizonWeeks?: number;
  copy?: Pick<PregnancyAlertCopy, 'ttDoseDueTitle' | 'ttDoseDueBody'>;
}): MaternalTtScheduledNotification[] {
  const now = params.now ?? new Date();
  const todayKey = toDateKey(now);
  const horizonWeeks = params.horizonWeeks ?? DEFAULT_HORIZON_WEEKS;
  const copy = params.copy ?? DEFAULT_COPY;

  const nextDoseId = getNextMaternalTtDoseId(params.maternalTtDoses);
  const forecast = getMaternalTtForecastDateKey(params.maternalTtDoses);
  if (!nextDoseId || nextDoseId === 'tt1' || !forecast) {
    return [];
  }

  // Weekly from the forecast date (same weekday), skipping past triggers.
  const doseLabel = nextDoseId.toUpperCase();
  const planned: MaternalTtScheduledNotification[] = [];
  const forecastDate = parseDateKey(forecast);

  for (let week = 0; week < horizonWeeks + 52; week += 1) {
    if (planned.length >= horizonWeeks) {
      break;
    }
    const day = addDays(forecastDate, week * 7);
    const dayKey = toDateKey(day);
    if (dayKey < todayKey) {
      continue;
    }
    const triggerAt = atLocalHour(day, REMINDER_HOUR);
    if (triggerAt.getTime() <= now.getTime()) {
      continue;
    }
    planned.push({
      identifier: `${MATERNAL_TT_NOTIFICATION_PREFIX}${nextDoseId}:${dayKey}`,
      triggerAt,
      title: copy.ttDoseDueTitle(doseLabel),
      body: copy.ttDoseDueBody(doseLabel),
      doseId: nextDoseId,
    });
  }

  return planned;
}

async function ensurePregnancyChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync('pregnancy', {
    name: 'Pregnancy reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

async function cancelMaternalTtNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .map((item) => item.identifier)
      .filter((identifier) => identifier.startsWith(MATERNAL_TT_NOTIFICATION_PREFIX))
      .map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
}

/** Schedules weekly local OS TT reminders. Best-effort; never throws. */
export async function syncMaternalTtScheduledNotifications(params: {
  maternalTtDoses: MaternalTtDose[];
  notificationsEnabled: boolean;
  now?: Date;
  copy?: Pick<PregnancyAlertCopy, 'ttDoseDueTitle' | 'ttDoseDueBody'>;
}): Promise<number> {
  try {
    if (!params.notificationsEnabled) {
      await cancelMaternalTtNotifications();
      return 0;
    }

    const settings = await Notifications.getPermissionsAsync();
    if (!allowsOsNotifications(settings)) {
      return 0;
    }

    await ensurePregnancyChannel();
    await cancelMaternalTtNotifications();

    const planned = collectMaternalTtScheduledNotifications(params);
    for (const item of planned) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: {
          title: item.title,
          body: item.body,
          sound: 'default',
          data: {
            domain: 'pregnancy',
            eventType: 'tt_dose_due',
            doseId: item.doseId,
            path: MATERNAL_TT_TRACKER_PATH,
          },
          ...(Platform.OS === 'android' ? { channelId: 'pregnancy' } : {}),
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
