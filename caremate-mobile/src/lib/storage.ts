import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function isWebBrowser(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
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
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWebBrowser()) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    if (Platform.OS === 'web') {
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWebBrowser()) {
      await AsyncStorage.removeItem(key);
      return;
    }
    if (Platform.OS === 'web') {
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
