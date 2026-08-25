import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';
import {
  loadMiniAppsOrder,
  mergeMiniAppsOrder,
  saveMiniAppsOrder,
} from '@/mini-apps/_kit/order-preference';
import { MINI_APPS } from '@/mini-apps/_kit/registry';

describe('mergeMiniAppsOrder', () => {
  it('returns registry order when nothing is saved', () => {
    expect(mergeMiniAppsOrder(null).map((app) => app.id)).toEqual(MINI_APPS.map((app) => app.id));
  });

  it('applies a custom order and appends new registry apps', () => {
    const custom = [
      'period-tracker',
      'vitals-tracker',
      'unknown-app',
      'period-tracker',
      'medication-tracker',
    ];
    expect(mergeMiniAppsOrder(custom).map((app) => app.id)).toEqual([
      'period-tracker',
      'vitals-tracker',
      'medication-tracker',
      'checkup-planner',
      'pregnancy-tracker',
      'immunization-tracker',
    ]);
  });

  it('uses the device-only storage key name', () => {
    expect(STORAGE_KEYS.miniAppsOrder).toBe('caremate_mini_apps_order');
  });
});

describe('loadMiniAppsOrder / saveMiniAppsOrder', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads registry order when storage is empty', async () => {
    const ordered = await loadMiniAppsOrder();
    expect(ordered.map((app) => app.id)).toEqual(MINI_APPS.map((app) => app.id));
  });

  it('persists and reloads a custom order', async () => {
    await saveMiniAppsOrder(['vitals-tracker', 'period-tracker']);
    const ordered = await loadMiniAppsOrder();
    expect(ordered.map((app) => app.id)[0]).toBe('vitals-tracker');
    expect(ordered.map((app) => app.id)[1]).toBe('period-tracker');
  });

  it('falls back when stored JSON is invalid', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.miniAppsOrder, '{not-json');
    expect((await loadMiniAppsOrder()).map((app) => app.id)).toEqual(
      MINI_APPS.map((app) => app.id),
    );

    await AsyncStorage.setItem(STORAGE_KEYS.miniAppsOrder, JSON.stringify([1, 2]));
    expect((await loadMiniAppsOrder()).map((app) => app.id)).toEqual(
      MINI_APPS.map((app) => app.id),
    );
  });
});
