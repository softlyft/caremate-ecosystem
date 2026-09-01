import {
  applyNotificationsEnabledPreference,
  claimExclusiveNotificationDevice,
  clearPushRegistration,
  reconcilePushRegistrationWithOsPermission,
  syncPushRegistration,
} from '@/domains/notifications/push';
import { useAuthStore } from '@/features/auth/store';
import { useSettingsStore } from '@/domains/profile/store';

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockUpsert = jest.fn();
const mockDeleteEq = jest.fn();
const mockDeleteNeq = jest.fn();
const mockSetNotificationsEnabled = jest.fn();
const mockSetDeviceDefaults = jest.fn();
const mockSaveSettings = jest.fn();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    easConfig: { projectId: 'test-project-id' },
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetExpoPushTokenAsync(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetNotificationChannelAsync(...args),
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
  multiRemove: jest.fn(async () => undefined),
}));

jest.mock('@/features/auth/store', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/domains/profile/store', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/domains/onboarding/device-defaults', () => ({
  setDeviceDefaults: (...args: unknown[]) => mockSetDeviceDefaults(...args),
}));

jest.mock('@/domains/profile/repository', () => ({
  profileRepository: {
    saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table !== 'notification_devices') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        upsert: (...args: unknown[]) => mockUpsert(...args),
        delete: () => ({
          eq: (...args: unknown[]) => {
            mockDeleteEq(...args);
            return {
              eq: jest.fn().mockResolvedValue({ error: null }),
              neq: (...neqArgs: unknown[]) => mockDeleteNeq(...neqArgs),
            };
          },
        }),
      };
    }),
  },
}));

const mockAuthGetState = useAuthStore.getState as jest.Mock;
const mockSettingsGetState = useSettingsStore.getState as jest.Mock;

describe('push registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteNeq.mockResolvedValue({ error: null });
    mockDeleteEq.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
      neq: mockDeleteNeq,
    }));
    mockUpsert.mockResolvedValue({ error: null });
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test]' });
    mockSetDeviceDefaults.mockResolvedValue({});
    mockSaveSettings.mockResolvedValue(undefined);
    mockSettingsGetState.mockReturnValue({
      notificationsEnabled: true,
      setNotificationsEnabled: mockSetNotificationsEnabled,
    });
  });

  it('no-ops for guests', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'guest' },
      isGuest: true,
      isAuthenticated: false,
    });

    await syncPushRegistration();

    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('no-ops when notifications are disabled', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });
    mockSettingsGetState.mockReturnValue({
      notificationsEnabled: false,
      setNotificationsEnabled: mockSetNotificationsEnabled,
    });

    await syncPushRegistration();

    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('upserts the Expo push token when signed in and enabled', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });

    await syncPushRegistration();

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project-id' });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        expo_push_token: 'ExponentPushToken[test]',
        platform: 'ios',
      }),
      { onConflict: 'expo_push_token' },
    );
    expect(mockDeleteNeq).not.toHaveBeenCalled();
  });

  it('removes other registered devices when replaceOtherDevices is set', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });

    await syncPushRegistration({ replaceOtherDevices: true });

    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockDeleteNeq).toHaveBeenCalledWith('expo_push_token', 'ExponentPushToken[test]');
  });

  it('claims exclusive notification device on sign-in and prunes stale tokens', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });

    await claimExclusiveNotificationDevice();

    expect(mockUpsert).toHaveBeenCalled();
    expect(mockDeleteNeq).toHaveBeenCalledWith('expo_push_token', 'ExponentPushToken[test]');
  });

  it('removes all push devices when notifications are disabled during claim', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });
    mockSettingsGetState.mockReturnValue({
      notificationsEnabled: false,
      setNotificationsEnabled: mockSetNotificationsEnabled,
    });

    await claimExclusiveNotificationDevice();

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockDeleteNeq).not.toHaveBeenCalled();
  });

  it('does not re-prompt when OS permission is already denied', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await syncPushRegistration();

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('requests permission when explicitly enabled from settings', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });

    await syncPushRegistration({ requestPermission: true });

    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('clears the current device token for the signed-in user', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });

    await clearPushRegistration();

    expect(mockDeleteEq).toHaveBeenCalled();
  });

  it('reconciles by clearing token and turning preference off when OS permission was revoked', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await reconcilePushRegistrationWithOsPermission();

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalled();
    expect(mockSetNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(mockSetDeviceDefaults).toHaveBeenCalledWith({ notificationsEnabled: false });
    expect(mockSaveSettings).toHaveBeenCalledWith('user-1', { notificationsEnabled: false });
  });

  it('reverts enable preference when OS permission is denied', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });
    mockGetPermissionsAsync
      .mockResolvedValueOnce({ status: 'denied', granted: false })
      .mockResolvedValueOnce({ status: 'denied', granted: false });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false });

    const result = await applyNotificationsEnabledPreference(true);

    expect(result).toEqual({ applied: false, osGranted: false });
    expect(mockSetNotificationsEnabled).toHaveBeenCalledWith(false);
  });

  it('treats iOS provisional authorization as allowed (does not force toggle off)', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'user-1' },
      isGuest: false,
      isAuthenticated: true,
    });
    mockGetPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
      granted: false,
      ios: { status: 3 }, // IosAuthorizationStatus.PROVISIONAL
    });

    await reconcilePushRegistrationWithOsPermission();

    expect(mockSetNotificationsEnabled).not.toHaveBeenCalledWith(false);
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockDeleteNeq).toHaveBeenCalledWith('expo_push_token', 'ExponentPushToken[test]');
  });
});
