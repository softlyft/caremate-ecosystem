import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import {
  getDeviceDefaults,
  setDeviceDefaults,
} from '@/domains/onboarding/device-defaults';
import {
  applyDeviceDefaultsToProfile,
  completePhaseA,
  getFinishSetupItems,
  getPostSignupHref,
  markEmergencyEssentialsDone,
  markFamilyPromptDone,
  resolvePostSignupHref,
  saveOnboardingEmergencyBasics,
} from '@/domains/onboarding/service';
import { useOnboardingDraftStore } from '@/domains/onboarding/store';
import { DEFAULT_DEVICE_DEFAULTS, type DeviceDefaults } from '@/domains/onboarding/types';

const mockSetOnboardingComplete = jest.fn();
const mockEnsureWelcome = jest.fn();
const mockProfileSave = jest.fn();
const mockSaveSettings = jest.fn();
const mockSetNotificationsEnabled = jest.fn();
const mockEmergencyFind = jest.fn();
const mockEmergencySave = jest.fn();

jest.mock('@/services/auth-service', () => ({
  authService: {
    setOnboardingComplete: (...args: unknown[]) => mockSetOnboardingComplete(...args),
  },
}));

jest.mock('@/domains/notifications/service', () => ({
  ensureWelcomeInAppNotification: (...args: unknown[]) => mockEnsureWelcome(...args),
}));

jest.mock('@/domains/profile/repository', () => ({
  profileRepository: {
    save: (...args: unknown[]) => mockProfileSave(...args),
    saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
  },
}));

jest.mock('@/domains/profile/store', () => ({
  useSettingsStore: {
    getState: () => ({
      setNotificationsEnabled: mockSetNotificationsEnabled,
    }),
  },
}));

jest.mock('@/features/auth/store', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'user-1' } }),
  },
}));

jest.mock('@/domains/emergency/repository', () => ({
  emergencyRepository: {
    findByUserId: (...args: unknown[]) => mockEmergencyFind(...args),
    save: (...args: unknown[]) => mockEmergencySave(...args),
  },
}));

describe('onboarding themes', () => {
  it('defines a theme for each onboarding step', () => {
    expect(ONBOARDING_STEP_THEMES).toHaveLength(6);
    expect(ONBOARDING_STEP_THEMES[2].accent).toBeTruthy();
  });
});

describe('onboarding draft store', () => {
  beforeEach(() => {
    useOnboardingDraftStore.getState().reset();
  });

  it('tracks emergency basics, location, and family intent', () => {
    const store = useOnboardingDraftStore.getState();
    store.setEmergencyBasics({ bloodGroup: 'O+', genotype: 'AA', allergies: 'Peanuts' });
    store.markEmergencyBasicsSaved();
    store.setCountry('NG');
    store.setLanguage('yo');
    store.setState('Lagos');
    store.setLocationMode('precise');
    store.setNotificationsEnabled(false);
    store.setWantsFamily(true);

    expect(useOnboardingDraftStore.getState()).toEqual(
      expect.objectContaining({
        bloodGroup: 'O+',
        genotype: 'AA',
        allergies: 'Peanuts',
        emergencyBasicsSaved: true,
        emergencyBasicsSkipped: false,
        countryCode: 'NG',
        languageCode: 'yo',
        state: 'Lagos',
        locationMode: 'precise',
        locationSkipped: false,
        notificationsEnabled: false,
        wantsFamily: true,
      }),
    );

    useOnboardingDraftStore.getState().skipLocation();
    expect(useOnboardingDraftStore.getState().locationMode).toBe('approximate');
    expect(useOnboardingDraftStore.getState().locationSkipped).toBe(true);
  });
});

describe('device defaults', () => {
  beforeEach(async () => {
    await setDeviceDefaults({ ...DEFAULT_DEVICE_DEFAULTS });
  });

  it('reads defaults and merges patches', async () => {
    expect(await getDeviceDefaults()).toEqual(DEFAULT_DEVICE_DEFAULTS);
    const next = await setDeviceDefaults({
      countryCode: 'GH',
      emergencyBasicsStarted: true,
      wantsFamily: true,
    });
    expect(next.countryCode).toBe('GH');
    expect(next.emergencyBasicsStarted).toBe(true);
    expect(next.wantsFamily).toBe(true);
    expect(next.notificationsEnabled).toBe(true);
  });

  it('migrates legacy priorities into wantsFamily', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.deviceDefaults,
      JSON.stringify({ priorities: ['family'] }),
    );
    const defaults = await getDeviceDefaults();
    expect(defaults.wantsFamily).toBe(true);
  });
});

describe('onboarding routing helpers', () => {
  const base: DeviceDefaults = {
    ...DEFAULT_DEVICE_DEFAULTS,
    wantsFamily: true,
    emergencyBasicsStarted: true,
  };

  it('routes post-signup based on unfinished emergency and family setup', () => {
    expect(getPostSignupHref(base)).toBe('/(app)/setup/emergency');
    expect(getPostSignupHref({ ...base, emergencyEssentialsDone: true })).toBe(
      '/(app)/setup/family-prompt',
    );
    expect(
      getPostSignupHref({
        ...base,
        emergencyEssentialsDone: true,
        familyPromptDone: true,
      }),
    ).toBe('/(app)/setup/done');
  });

  it('marks setup steps complete', async () => {
    await setDeviceDefaults({
      ...base,
      emergencyEssentialsDone: false,
      familyPromptDone: false,
    });
    await expect(markEmergencyEssentialsDone()).resolves.toBe('/(app)/setup/family-prompt');
    await expect(markFamilyPromptDone()).resolves.toBe('/(app)/setup/done');
  });

  it('builds finish-setup items for guests and members', async () => {
    await setDeviceDefaults({ ...base, wantsFamily: true, emergencyBasicsStarted: true });

    const guest = await getFinishSetupItems({
      isGuest: true,
      hasCountry: false,
      hasEmergencyEssentials: false,
      hasHousehold: false,
    });
    expect(guest.map((item) => item.id)).toEqual([
      'country',
      'account-emergency',
      'account-family',
    ]);

    const member = await getFinishSetupItems({
      isGuest: false,
      hasCountry: true,
      hasEmergencyEssentials: false,
      hasHousehold: false,
    });
    expect(member.map((item) => item.id)).toEqual(['emergency', 'family']);
  });

  it('completes phase A and applies device defaults to a profile', async () => {
    useOnboardingDraftStore.getState().reset();
    useOnboardingDraftStore.getState().setCountry('NG');
    useOnboardingDraftStore.getState().setLanguage('yo');
    useOnboardingDraftStore.getState().setWantsFamily(true);
    mockSetOnboardingComplete.mockResolvedValue(undefined);
    mockEnsureWelcome.mockResolvedValue(undefined);
    mockProfileSave.mockResolvedValue(undefined);
    mockSaveSettings.mockResolvedValue(undefined);

    const defaults = await completePhaseA();
    expect(defaults.countryCode).toBe('NG');
    expect(defaults.languageCode).toBe('yo');
    expect(defaults.wantsFamily).toBe(true);
    expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    expect(mockEnsureWelcome).toHaveBeenCalled();

    await applyDeviceDefaultsToProfile('user-1');
    expect(mockProfileSave).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ countryCode: 'NG', languageCode: 'yo' }),
    );
    expect(mockSaveSettings).toHaveBeenCalled();

    await setDeviceDefaults({
      ...DEFAULT_DEVICE_DEFAULTS,
      emergencyEssentialsDone: true,
      familyPromptDone: true,
    });
    await expect(resolvePostSignupHref()).resolves.toBe('/(app)/setup/done');
  });

  it('saves onboarding emergency basics locally', async () => {
    mockEmergencyFind.mockResolvedValue(null);
    mockEmergencySave.mockResolvedValue(undefined);

    await saveOnboardingEmergencyBasics({
      bloodGroup: 'B+',
      genotype: 'AS',
      allergies: 'Shellfish',
    });

    expect(mockEmergencySave).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        bloodGroup: 'B+',
        genotype: 'AS',
        allergies: ['Shellfish'],
      }),
    );
  });
});
