import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { allowsOsNotifications } from '@/domains/notifications/push';
import { getDailyHealthTip } from '@/features/home/utils/daily-health-tip';
import { useAuthStore } from '@/features/auth/store';
import { useSettingsStore } from '@/domains/profile/store';
import { addDays, parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

export const DAILY_TIP_NOTIFICATION_PREFIX = 'tip:';
export const DAILY_TIP_HOME_PATH = '/(app)/(tabs)/';
const DEFAULT_HORIZON_DAYS = 7;
const REMINDER_HOUR = 8;

export type DailyTipScheduledNotification = {
  identifier: string;
  triggerAt: Date;
  title: string;
  body: string;
  dateKey: string;
};

function atLocalHour(date: Date, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
}

/**
 * Pure planner for tests + syncDailyTipScheduledNotifications.
 * Schedules one local DATE trigger per tip body at 08:00 device-local.
 */
export function collectDailyTipScheduledNotifications(params: {
  tips: Array<{ dateKey: string; body: string }>;
  now?: Date;
  title?: string;
  reminderHour?: number;
}): DailyTipScheduledNotification[] {
  const now = params.now ?? new Date();
  const title = params.title ?? 'Daily insight';
  const reminderHour = params.reminderHour ?? REMINDER_HOUR;
  const planned: DailyTipScheduledNotification[] = [];

  for (const tip of params.tips) {
    const body = tip.body.trim();
    if (!body) {
      continue;
    }
    const day = parseDateKey(tip.dateKey);
    const triggerAt = atLocalHour(day, reminderHour);
    if (triggerAt.getTime() <= now.getTime()) {
      continue;
    }
    planned.push({
      identifier: `${DAILY_TIP_NOTIFICATION_PREFIX}${tip.dateKey}`,
      triggerAt,
      title,
      body,
      dateKey: tip.dateKey,
    });
  }

  return planned;
}

async function ensureTipsChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync('tips', {
    name: 'Daily insights',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/** Cancel all local OS daily tip reminders on this device. Best-effort; never throws. */
export async function cancelDailyTipScheduledNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .map((item) => item.identifier)
        .filter((identifier) => identifier.startsWith(DAILY_TIP_NOTIFICATION_PREFIX))
        .map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
    );
  } catch {
    // Best-effort cleanup.
  }
}

/** Schedules ~7 mornings of local tip reminders at 08:00. Best-effort; never throws.
 * Works for guests and signed-in users (device-local DATE triggers; no remote push).
 */
export async function syncDailyTipScheduledNotifications(params: {
  userKey: string;
  notificationsEnabled: boolean;
  dailyTipRemindersEnabled: boolean;
  now?: Date;
  horizonDays?: number;
  title?: string;
}): Promise<number> {
  try {
    if (!params.notificationsEnabled || !params.dailyTipRemindersEnabled) {
      await cancelDailyTipScheduledNotifications();
      return 0;
    }

    const settings = await Notifications.getPermissionsAsync();
    if (!allowsOsNotifications(settings)) {
      await cancelDailyTipScheduledNotifications();
      return 0;
    }

    await ensureTipsChannel();
    await cancelDailyTipScheduledNotifications();

    const now = params.now ?? new Date();
    const horizonDays = params.horizonDays ?? DEFAULT_HORIZON_DAYS;
    const tips: Array<{ dateKey: string; body: string }> = [];

    for (let offset = 0; offset < horizonDays; offset += 1) {
      const day = addDays(now, offset);
      const dateKey = toDateKey(day);
      const tip = await getDailyHealthTip(params.userKey, day);
      if (tip?.tip?.trim()) {
        tips.push({ dateKey, body: tip.tip.trim() });
      }
    }

    const planned = collectDailyTipScheduledNotifications({
      tips,
      now,
      title: params.title,
    });

    for (const item of planned) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: {
          title: item.title,
          body: item.body,
          sound: 'default',
          data: {
            domain: 'tips',
            eventType: 'daily_insight',
            dateKey: item.dateKey,
            path: DAILY_TIP_HOME_PATH,
          },
          ...(Platform.OS === 'android' ? { channelId: 'tips' } : {}),
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

/** Read auth + settings and reschedule tip reminders. Best-effort. */
export async function resyncDailyTipScheduledNotifications(options?: {
  now?: Date;
  title?: string;
}): Promise<number> {
  const { user, isGuest } = useAuthStore.getState();
  const { notificationsEnabled, dailyTipRemindersEnabled } = useSettingsStore.getState();
  return syncDailyTipScheduledNotifications({
    userKey: !isGuest && user?.id ? user.id : 'guest',
    notificationsEnabled,
    dailyTipRemindersEnabled,
    now: options?.now,
    title: options?.title,
  });
}
