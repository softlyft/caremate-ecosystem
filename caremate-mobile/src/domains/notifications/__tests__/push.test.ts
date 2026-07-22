import { clearPushRegistration, syncPushRegistration } from '@/domains/notifications/push';
import { useAuthStore } from '@/features/auth/store';
import { useSettingsStore } from '@/domains/profile/store';

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockUpsert = jest.fn();
const mockDeleteEq = jest.fn();

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
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
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

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table !== 'notification_devices') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        upsert: (...args: unknown[]) => mockUpsert(...args),
        delete: () => ({
          eq: (...args: unknown[]) => mockDeleteEq(...args),
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
    mockDeleteEq.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test]' });
  });

  it('no-ops for guests', async () => {
    mockAuthGetState.mockReturnValue({
      user: { id: 'guest' },
      isGuest: true,
      isAuthenticated: false,
    });
    mockSettingsGetState.mockReturnValue({ notificationsEnabled: true });

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
    mockSettingsGetState.mockReturnValue({ notificationsEnabled: false });

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
    mockSettingsGetState.mockReturnValue({ notificationsEnabled: true });

    await syncPushRegistration();

    expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project-id' });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        expo_push_token: 'ExponentPushToken[test]',
        platform: 'ios',
      }),
      { onConflict: 'expo_push_token' },
    );
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
});
