import { wipeLocalAccountData } from '@/domains/auth/wipe-local-account';
import { GUEST_USER_ID } from '@/constants/guest';

jest.mock('@/database/client', () => ({
  isDatabaseInitialized: () => false,
  getDatabase: () => {
    throw new Error('should not touch DB for guest wipe');
  },
}));

jest.mock('@/mini-apps/medication-tracker/store', () => ({
  useMedicationTrackerStore: { getState: () => ({ clearAll: jest.fn() }) },
}));
jest.mock('@/mini-apps/vitals-tracker/store', () => ({
  useVitalsTrackerStore: { getState: () => ({ clearAll: jest.fn() }) },
}));
jest.mock('@/mini-apps/checkup-planner/store', () => ({
  useCheckupPlannerStore: { getState: () => ({ clearAll: jest.fn() }) },
}));
jest.mock('@/mini-apps/immunization-tracker/store', () => ({
  useImmunizationTrackerStore: { getState: () => ({ clearAll: jest.fn() }) },
}));
jest.mock('@/mini-apps/pregnancy-tracker/store', () => ({
  usePregnancyTrackerStore: { getState: () => ({ clearAll: jest.fn() }) },
}));
jest.mock('@/mini-apps/period-tracker/store', () => ({
  usePeriodTrackerStore: { getState: () => ({ clearAll: jest.fn() }) },
}));

jest.mock('@/mini-apps/_kit/synced-storage', () => ({
  clearMiniAppAsyncStorage: jest.fn(async () => undefined),
}));

jest.mock('@/domains/emergency/lock-surface', () => ({
  syncEmergencyLockSurface: jest.fn(async () => undefined),
}));

describe('wipeLocalAccountData', () => {
  it('no-ops for guest user id', async () => {
    await expect(wipeLocalAccountData(GUEST_USER_ID)).resolves.toBeUndefined();
  });

  it('no-ops when database is not initialized', async () => {
    await expect(wipeLocalAccountData('user-1')).resolves.toBeUndefined();
  });
});
