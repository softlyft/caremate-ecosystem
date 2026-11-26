import { useSettingsStore } from '@/domains/profile/store';
import { useFamilySetupStore } from '@/domains/family/store';

describe('settings store', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      notificationsEnabled: true,
      dailyTipRemindersEnabled: true,
    });
  });

  it('updates notifications', () => {
    useSettingsStore.getState().setNotificationsEnabled(false);
    expect(useSettingsStore.getState()).toEqual({
      notificationsEnabled: false,
      dailyTipRemindersEnabled: true,
      setNotificationsEnabled: expect.any(Function),
      setDailyTipRemindersEnabled: expect.any(Function),
      hydrateFromSettings: expect.any(Function),
    });
  });

  it('hydrates from saved settings', () => {
    useSettingsStore.getState().hydrateFromSettings({
      id: 'settings-1',
      userId: 'user-1',
      theme: 'light',
      notificationsEnabled: false,
      dailyTipRemindersEnabled: false,
      subscribedCategoryIds: [],
      syncStatus: 'synced',
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
    expect(useSettingsStore.getState().dailyTipRemindersEnabled).toBe(false);
  });

  it('treats missing daily tip pref as on when hydrating', () => {
    useSettingsStore.getState().hydrateFromSettings({
      id: 'settings-1',
      userId: 'user-1',
      theme: 'light',
      notificationsEnabled: true,
      // Legacy rows / partial payloads
      dailyTipRemindersEnabled: undefined as unknown as boolean,
      subscribedCategoryIds: [],
      syncStatus: 'synced',
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(useSettingsStore.getState().dailyTipRemindersEnabled).toBe(true);
  });
});

describe('family setup store', () => {
  beforeEach(() => {
    useFamilySetupStore.getState().reset();
  });

  it('manages parent flag, child count, and child drafts', () => {
    const store = useFamilySetupStore.getState();
    store.setIsParent(true);
    store.setChildCount(2);
    store.upsertChild(1, {
      fullName: 'Tola',
      dateOfBirth: '2020-01-01',
      gender: 'female',
      notes: '',
    });

    expect(useFamilySetupStore.getState().isParent).toBe(true);
    expect(useFamilySetupStore.getState().childCount).toBe(2);
    expect(useFamilySetupStore.getState().children[1]?.fullName).toBe('Tola');

    store.setChildCount(1);
    expect(useFamilySetupStore.getState().children).toHaveLength(1);
  });
});
