import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useAuthStore } from '@/features/auth/store';
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

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted' && options?.requestPermission) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    if (__DEV__) {
      console.warn(
        'syncPushRegistration: notification permission not granted',
        finalStatus,
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
 * Align remote push registration with the current OS permission.
 * Clears the device token when permission was revoked; re-syncs when granted again.
 * Never prompts the user.
 */
export async function reconcilePushRegistrationWithOsPermission(): Promise<void> {
  try {
    const { user, isGuest, isAuthenticated } = useAuthStore.getState();
    const notificationsEnabled = useSettingsStore.getState().notificationsEnabled;
    if (!isAuthenticated || isGuest || !user?.id || !notificationsEnabled) {
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      await syncPushRegistration();
      return;
    }
    await clearPushRegistration();
  } catch (err) {
    console.warn(
      'reconcilePushRegistrationWithOsPermission',
      err instanceof Error ? err.message : err,
    );
  }
}
