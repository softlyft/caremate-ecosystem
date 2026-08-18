import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** AsyncStorage mirror when Keychain entitlements are unavailable in unsigned simulator builds. */
const DEV_SECURE_FALLBACK_PREFIX = '__dev_secure_fallback__';

function isWebBrowser(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function devFallbackKey(key: string): string {
  return `${DEV_SECURE_FALLBACK_PREFIX}${key}`;
}

async function secureGetItem(
  key: string,
  options?: SecureStore.SecureStoreOptions,
): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, options);
  } catch {
    if (__DEV__) {
      return AsyncStorage.getItem(devFallbackKey(key));
    }
    throw new Error('Secure storage is unavailable');
  }
}

async function secureSetItem(
  key: string,
  value: string,
  options?: SecureStore.SecureStoreOptions,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, options);
  } catch {
    if (__DEV__) {
      await AsyncStorage.setItem(devFallbackKey(key), value);
      return;
    }
    throw new Error('Secure storage is unavailable');
  }
}

async function secureRemoveItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    if (__DEV__) {
      await AsyncStorage.removeItem(devFallbackKey(key));
      return;
    }
    throw new Error('Secure storage is unavailable');
  }
}

export const authStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWebBrowser()) {
      return AsyncStorage.getItem(key);
    }
    if (Platform.OS === 'web') {
      // Expo Router static render runs in Node where window is unavailable.
      return null;
    }
    return secureGetItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWebBrowser()) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    if (Platform.OS === 'web') {
      return;
    }
    await secureSetItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWebBrowser()) {
      await AsyncStorage.removeItem(key);
      return;
    }
    if (Platform.OS === 'web') {
      return;
    }
    await secureRemoveItem(key);
  },
};
