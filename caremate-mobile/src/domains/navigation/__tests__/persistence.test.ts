import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';
import {
  LAST_ROUTE_MAX_AGE_MS,
  isRestorableAppHref,
  saveLastAppHref,
  takeLastAppHref,
  toRestorableAppHref,
} from '@/domains/navigation/persistence';

describe('navigation/persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.lastAppRoute);
  });

  it('maps pathnames to /(app) hrefs', () => {
    expect(toRestorableAppHref('/articles/abc-123')).toBe('/(app)/articles/abc-123');
    expect(toRestorableAppHref('/')).toBe('/(app)/(tabs)');
    expect(toRestorableAppHref('/profile')).toBe('/(app)/(tabs)/profile');
    expect(toRestorableAppHref('/articles', { category: 'heart' })).toBe(
      '/(app)/(tabs)/articles?category=heart',
    );
    expect(toRestorableAppHref('/apps/period-tracker')).toBe('/(app)/apps/period-tracker');
  });

  it('rejects auth and billing paths', () => {
    expect(toRestorableAppHref('/(auth)/login')).toBeNull();
    expect(toRestorableAppHref('/auth/reset-password')).toBeNull();
    expect(toRestorableAppHref('/billing/success')).toBeNull();
    expect(isRestorableAppHref('/(auth)/login')).toBe(false);
    expect(isRestorableAppHref('/(app)/articles/1')).toBe(true);
  });

  it('saves and consumes a fresh last route', async () => {
    await saveLastAppHref('/(app)/articles/abc');
    await expect(takeLastAppHref()).resolves.toBe('/(app)/articles/abc');
    await expect(takeLastAppHref()).resolves.toBeNull();
  });

  it('ignores expired last routes', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.lastAppRoute,
      JSON.stringify({
        href: '/(app)/articles/old',
        savedAt: Date.now() - LAST_ROUTE_MAX_AGE_MS - 1,
      }),
    );
    await expect(takeLastAppHref()).resolves.toBeNull();
  });
});
