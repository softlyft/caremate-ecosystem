import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useAuthStore } from '@/features/auth/store';
import { setDeviceDefaults } from '@/domains/onboarding/device-defaults';
import { profileRepository } from '@/domains/profile/repository';
import { useSettingsStore } from '@/domains/profile/store';
import { supabase } from '@/lib/supabase';

const FALLBACK_EAS_PROJECT_ID = 'de6abf70-ee13-417b-915f-9dea1066ed27';
const REGISTERED_TOKEN_KEY = 'caremate_expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function resolveProjectId(): string | null {
  const fromEas = Constants.easConfig?.projectId;
  if (typeof fromEas === 'string' && fromEas.trim()) {
    return fromEas.trim();
  }
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return fromExtra.trim();
  }
  return FALLBACK_EAS_PROJECT_ID;
}

function resolvePlatform(): 'ios' | 'android' | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Whether the OS currently allows delivering notifications.
 * On iOS, provisional / ephemeral authorization can deliver quietly even when
 * top-level `status` is not always `'granted'` — match Expo’s recommended check.
 */
export function allowsOsNotifications(
  settings: Notifications.NotificationPermissionsStatus,
): boolean {
  if (settings.granted || settings.status === 'granted') {
    return true;
  }
  const iosStatus = settings.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

/** Persist in-app preference so the toggle matches OS permission / user choice. */
async function persistNotificationsEnabled(enabled: boolean): Promise<void> {
  useSettingsStore.getState().setNotificationsEnabled(enabled);
  try {
    await setDeviceDefaults({ notificationsEnabled: enabled });
  } catch {
    // Device defaults are best-effort.
  }
  const { user, isGuest, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || isGuest || !user?.id) {
    return;
  }
  try {
    await profileRepository.saveSettings(user.id, { notificationsEnabled: enabled });
  } catch {
    // Cloud settings are best-effort.
  }
}

async function removeOtherPushDevicesForUser(userId: string, keepToken: string): Promise<void> {
  const { error } = await supabase
    .from('notification_devices')
    .delete()
    .eq('user_id', userId)
    .neq('expo_push_token', keepToken);

  if (error && __DEV__) {
    console.warn('removeOtherPushDevicesForUser failed', error.message);
  }
}

async function removeAllPushDevicesForUser(userId: string): Promise<void> {
  const { error } = await supabase.from('notification_devices').delete().eq('user_id', userId);

  if (error && __DEV__) {
    console.warn('removeAllPushDevicesForUser failed', error.message);
  }
}

/**
 * After interactive sign-in, register this device for push and revoke tokens on other devices.
 * Accounts are device-bound — only the active device should receive remote reminders.
 */
export async function claimExclusiveNotificationDevice(): Promise<void> {
  const { user, isGuest, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || isGuest || !user?.id) {
    return;
  }

  const notificationsEnabled = useSettingsStore.getState().notificationsEnabled;
  if (!notificationsEnabled) {
    await removeAllPushDevicesForUser(user.id);
    return;
  }

  const token = await getCurrentExpoPushToken();
  if (!token) {
    await removeAllPushDevicesForUser(user.id);
    return;
  }

  await syncPushRegistration({ replaceOtherDevices: true });
}

async function getCurrentExpoPushToken(options?: {
  /** When true, prompt the OS if permission is not already granted (settings toggle). */
  requestPermission?: boolean;
}): Promise<string | null> {
  const platform = resolvePlatform();
  if (!platform) {
    if (__DEV__) console.warn('syncPushRegistration: unsupported platform');
    return null;
  }
  if (!Device.isDevice && !__DEV__) {
    if (__DEV__) console.warn('syncPushRegistration: not a physical device');
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    if (__DEV__) console.warn('syncPushRegistration: missing EAS projectId');
    return null;
  }

  await ensureAndroidChannel();

  let settings = await Notifications.getPermissionsAsync();
  if (!allowsOsNotifications(settings) && options?.requestPermission) {
    settings = await Notifications.requestPermissionsAsync();
  }
  if (!allowsOsNotifications(settings)) {
    if (__DEV__) {
      console.warn(
        'syncPushRegistration: notification permission not granted',
        settings.status,
        settings.ios?.status,
        options?.requestPermission ? '(after prompt)' : '(no prompt on this call)',
      );
    }
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult.data?.trim();
    if (!token && __DEV__) {
      console.warn('syncPushRegistration: getExpoPushTokenAsync returned empty token');
    }
    return token || null;
  } catch (err) {
    console.warn(
      'syncPushRegistration: getExpoPushTokenAsync failed',
      err instanceof Error ? err.message : err,
      '(Need a native build with FCM/APNs — Expo Go may fail on some platforms.)',
    );
    return null;
  }
}

/**
 * Register this device for Expo push when the user is signed in and notifications are enabled.
 * Guests and prefs-off are no-ops.
 * By default does not re-prompt the OS (cold start / foreground); pass `requestPermission`
 * when the user explicitly enables notifications in settings.
 */
export async function syncPushRegistration(options?: {
  requestPermission?: boolean;
  /** When true, delete other registered devices for this user after upsert. */
  replaceOtherDevices?: boolean;
}): Promise<void> {
  try {
    const { user, isGuest, isAuthenticated } = useAuthStore.getState();
    const notificationsEnabled = useSettingsStore.getState().notificationsEnabled;

    if (!isAuthenticated || isGuest || !user?.id || !notificationsEnabled) {
      if (__DEV__) {
        console.warn('syncPushRegistration: skipped', {
          isAuthenticated,
          isGuest,
          userId: user?.id ?? null,
          notificationsEnabled,
        });
      }
      return;
    }

    const token = await getCurrentExpoPushToken({
      requestPermission: options?.requestPermission === true,
    });
    if (!token) return;

    const platform = resolvePlatform();
    if (!platform) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from('notification_devices').upsert(
      {
        user_id: user.id,
        expo_push_token: token,
        platform,
        last_seen_at: now,
      },
      { onConflict: 'expo_push_token' },
    );

    if (error) {
      console.warn('syncPushRegistration upsert failed', error.message);
      return;
    }

    if (options?.replaceOtherDevices) {
      await removeOtherPushDevicesForUser(user.id, token);
    }

    if (__DEV__) {
      console.warn('syncPushRegistration: registered', platform, token.slice(0, 24) + '…');
    }
    await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, token);
  } catch (err) {
    console.warn('syncPushRegistration', err instanceof Error ? err.message : err);
  }
}

/**
 * Remove this device's push token (prefs off or sign-out). Best-effort.
 * Never falls back to deleting every device for the user.
 */
export async function clearPushRegistration(): Promise<void> {
  try {
    const { user, isGuest, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || isGuest || !user?.id) {
      return;
    }

    const platform = resolvePlatform();
    if (!platform) return;

    let token = (await AsyncStorage.getItem(REGISTERED_TOKEN_KEY))?.trim() || null;
    if (!token) {
      try {
        const projectId = resolveProjectId();
        if (projectId) {
          const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
          token = tokenResult.data?.trim() || null;
        }
      } catch {
        token = null;
      }
    }

    if (!token) {
      await AsyncStorage.removeItem(REGISTERED_TOKEN_KEY);
      return;
    }

    await supabase
      .from('notification_devices')
      .delete()
      .eq('user_id', user.id)
      .eq('expo_push_token', token);
    await AsyncStorage.removeItem(REGISTERED_TOKEN_KEY);
  } catch (err) {
    console.warn('clearPushRegistration', err instanceof Error ? err.message : err);
  }
}

/**
 * Align in-app Push toggle + remote registration with OS notification permission.
 * Clears the device token and turns the preference off when permission is missing.
 * Never prompts the user. Works for iOS (including Settings → Notifications off) and Android.
 */
export async function reconcilePushRegistrationWithOsPermission(): Promise<void> {
  try {
    const { user, isGuest, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || isGuest || !user?.id) {
      return;
    }

    const settings = await Notifications.getPermissionsAsync();
    const notificationsEnabled = useSettingsStore.getState().notificationsEnabled;

    if (allowsOsNotifications(settings)) {
      if (notificationsEnabled) {
        await syncPushRegistration({ replaceOtherDevices: true });
      }
      return;
    }

    await clearPushRegistration();
    if (notificationsEnabled) {
      await persistNotificationsEnabled(false);
    }
  } catch (err) {
    console.warn(
      'reconcilePushRegistrationWithOsPermission',
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * User flipped the Push notifications switch. Requests OS permission when enabling;
 * reverts the toggle if the OS denies (or previously revoked) permission.
 * On iOS after Deny, the system will not re-prompt — Open Settings is required.
 */
export async function applyNotificationsEnabledPreference(enabled: boolean): Promise<{
  applied: boolean;
  osGranted: boolean;
}> {
  if (!enabled) {
    await persistNotificationsEnabled(false);
    await clearPushRegistration();
    return { applied: true, osGranted: false };
  }

  await persistNotificationsEnabled(true);
  await syncPushRegistration({ requestPermission: true, replaceOtherDevices: true });

  const settings = await Notifications.getPermissionsAsync();
  if (allowsOsNotifications(settings)) {
    return { applied: true, osGranted: true };
  }

  await persistNotificationsEnabled(false);
  await clearPushRegistration();
  return { applied: false, osGranted: false };
}
