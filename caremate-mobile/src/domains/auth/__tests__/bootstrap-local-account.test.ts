import { identityFromAuthUser } from '@/domains/auth/auth-identity';
import { bootstrapLocalAccountRecords } from '@/domains/auth/bootstrap-local-account';

describe('identityFromAuthUser', () => {
  it('reads email, metadata name, and phone', () => {
    expect(
      identityFromAuthUser({
        id: 'user-1',
        email: 'a@example.com',
        phone: '+234800',
        user_metadata: { full_name: 'Ada Lovelace', phone: '+234111' },
      }),
    ).toEqual({
      userId: 'user-1',
      email: 'a@example.com',
      fullName: 'Ada Lovelace',
      phone: '+234111',
    });
  });

  it('falls back to auth phone when metadata phone is missing', () => {
    expect(
      identityFromAuthUser({
        id: 'user-2',
        email: 'b@example.com',
        phone: '+234800',
        user_metadata: { full_name: 'Grace Hopper' },
      }).phone,
    ).toBe('+234800');
  });
});

const mockIsDatabaseInitialized = jest.fn();
const mockFindByUserId = jest.fn();
const mockSave = jest.fn();
const mockGetSettings = jest.fn();
const mockSaveSettings = jest.fn();
const mockGetDeviceDefaults = jest.fn();
const mockApplyDeviceDefaultsToProfile = jest.fn();
const mockEmergencyFind = jest.fn();
const mockEmergencySave = jest.fn();
const mockEmergencyEnsureShell = jest.fn();
const mockSetNotificationsEnabled = jest.fn();
const mockHydrateFromSettings = jest.fn();

jest.mock('@/database/client', () => ({
  isDatabaseInitialized: (...args: unknown[]) => mockIsDatabaseInitialized(...args),
}));

jest.mock('@/domains/profile/repository', () => ({
  profileRepository: {
    findByUserId: (...args: unknown[]) => mockFindByUserId(...args),
    save: (...args: unknown[]) => mockSave(...args),
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
  },
}));

jest.mock('@/domains/onboarding', () => ({
  getDeviceDefaults: (...args: unknown[]) => mockGetDeviceDefaults(...args),
  applyDeviceDefaultsToProfile: (...args: unknown[]) => mockApplyDeviceDefaultsToProfile(...args),
}));

jest.mock('@/domains/emergency/repository', () => ({
  emergencyRepository: {
    findByUserId: (...args: unknown[]) => mockEmergencyFind(...args),
    save: (...args: unknown[]) => mockEmergencySave(...args),
    ensureLocalShell: (...args: unknown[]) => mockEmergencyEnsureShell(...args),
  },
}));

jest.mock('@/domains/profile/store', () => ({
  useSettingsStore: {
    getState: () => ({
      setNotificationsEnabled: mockSetNotificationsEnabled,
      hydrateFromSettings: mockHydrateFromSettings,
    }),
  },
}));

describe('bootstrapLocalAccountRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDatabaseInitialized.mockReturnValue(true);
    mockGetDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      languageCode: 'en',
      state: 'Lagos',
      notificationsEnabled: true,
    });
    mockFindByUserId.mockResolvedValue(null);
    mockGetSettings.mockResolvedValue(null);
    mockEmergencyFind.mockResolvedValue(null);
    mockSave.mockResolvedValue(undefined);
    mockSaveSettings.mockResolvedValue(undefined);
    mockEmergencySave.mockResolvedValue(undefined);
    mockEmergencyEnsureShell.mockResolvedValue(undefined);
  });

  it('no-ops when the database is not ready', async () => {
    mockIsDatabaseInitialized.mockReturnValue(false);
    await bootstrapLocalAccountRecords({
      userId: 'user-1',
      email: 'a@example.com',
      fullName: 'Ada',
      phone: null,
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('creates profile, settings, and emergency rows for a new account', async () => {
    mockFindByUserId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        fullName: 'Ada',
        email: 'a@example.com',
        phone: null,
        countryCode: null,
        languageCode: null,
        state: null,
      })
      .mockResolvedValueOnce({
        fullName: 'Ada',
        email: 'a@example.com',
        phone: null,
        countryCode: 'NG',
        languageCode: 'en',
        state: 'Lagos',
      });

    await bootstrapLocalAccountRecords({
      userId: 'user-1',
      email: 'a@example.com',
      fullName: 'Ada',
      phone: '+234',
    });

    expect(mockSave).toHaveBeenCalled();
    expect(mockSaveSettings).toHaveBeenCalled();
    expect(mockEmergencyEnsureShell).toHaveBeenCalledWith('user-1', { fullName: 'Ada' });
    expect(mockEmergencySave).not.toHaveBeenCalled();
    expect(mockSetNotificationsEnabled).toHaveBeenCalledWith(true);
  });

  it('forces device defaults when requested', async () => {
    mockFindByUserId.mockResolvedValue({
      fullName: 'Ada',
      email: 'a@example.com',
      phone: null,
      countryCode: 'NG',
      languageCode: 'en',
      state: 'Lagos',
    });
    mockEmergencyFind.mockResolvedValue({ fullName: 'Ada' });

    await bootstrapLocalAccountRecords(
      { userId: 'user-1', email: 'a@example.com', fullName: 'Ada', phone: null },
      { forceDeviceDefaults: true },
    );

    expect(mockApplyDeviceDefaultsToProfile).toHaveBeenCalledWith('user-1');
  });

  it('hydrates the settings store from an existing settings row', async () => {
    mockFindByUserId.mockResolvedValue({
      fullName: 'Ada',
      email: 'a@example.com',
      phone: null,
      countryCode: 'NG',
      languageCode: 'en',
      state: 'Lagos',
    });
    mockGetSettings.mockResolvedValue({
      theme: 'system',
      notificationsEnabled: false,
      subscribedCategoryIds: [],
    });
    mockEmergencyFind.mockResolvedValue({ fullName: 'Ada' });

    await bootstrapLocalAccountRecords({
      userId: 'user-1',
      email: 'a@example.com',
      fullName: 'Ada',
      phone: null,
    });

    expect(mockSaveSettings).not.toHaveBeenCalled();
    expect(mockHydrateFromSettings).toHaveBeenCalledWith({
      theme: 'system',
      notificationsEnabled: false,
      subscribedCategoryIds: [],
    });
    expect(mockSetNotificationsEnabled).not.toHaveBeenCalled();
  });
});
