import { STORAGE_KEYS } from '@/constants/config';
import { mergeMiniAppsOrder } from '@/mini-apps/_kit/order-preference';
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
