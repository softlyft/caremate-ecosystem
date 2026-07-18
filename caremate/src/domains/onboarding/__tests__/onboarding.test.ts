import { ONBOARDING_STEP_THEMES, PRIORITY_VISUALS } from '@/domains/onboarding/themes';
import {
  getDeviceDefaults,
  setDeviceDefaults,
  updateDeviceDefaults,
} from '@/domains/onboarding/device-defaults';
import {
  applyDeviceDefaultsToProfile,
  completePhaseA,
  getFinishSetupItems,
  getPostSignupHref,
  markEmergencyEssentialsDone,
  markFamilyPromptDone,
  resolvePostSignupHref,
} from '@/domains/onboarding/service';
import { useOnboardingDraftStore } from '@/domains/onboarding/store';
import { DEFAULT_DEVICE_DEFAULTS, type DeviceDefaults } from '@/domains/onboarding/types';

const mockSetOnboardingComplete = jest.fn();
const mockEnsureWelcome = jest.fn();
const mockProfileSave = jest.fn();
const mockSaveSettings = jest.fn();
const mockSetNotificationsEnabled = jest.fn();

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

describe('onboarding themes', () => {
  it('defines a theme for each onboarding step and priority', () => {
    expect(ONBOARDING_STEP_THEMES).toHaveLength(6);
    expect(PRIORITY_VISUALS.emergency.accent).toBeTruthy();
    expect(PRIORITY_VISUALS.learn.soft).toBeTruthy();
  });
});

describe('onboarding draft store', () => {
  beforeEach(() => {
    useOnboardingDraftStore.getState().reset();
  });

  it('toggles priorities and tracks location choices', () => {
    const store = useOnboardingDraftStore.getState();
    store.togglePriority('emergency');
    store.togglePriority('family');
    store.togglePriority('emergency');
    store.setCountry('NG');
    store.setLanguage('yo');
    store.setState('Lagos');
    store.setLocationMode('precise');
    store.setNotificationsEnabled(false);

    expect(useOnboardingDraftStore.getState()).toEqual(
      expect.objectContaining({
        priorities: ['family'],
        countryCode: 'NG',
        languageCode: 'yo',
        state: 'Lagos',
        locationMode: 'precise',
        locationSkipped: false,
        notificationsEnabled: false,
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
    const next = await setDeviceDefaults({ countryCode: 'GH', priorities: ['learn'] });
    expect(next.countryCode).toBe('GH');
    expect(next.priorities).toEqual(['learn']);
    expect(next.notificationsEnabled).toBe(true);
  });

  it('updates via updater and normalizes bad priorities', async () => {
    const updated = await updateDeviceDefaults((current) => ({
      ...current,
      languageCode: 'en',
      priorities: 'bad' as unknown as DeviceDefaults['priorities'],
    }));
    expect(updated.languageCode).toBe('en');
    expect(updated.priorities).toEqual([]);
  });
});

describe('onboarding routing helpers', () => {
  const base: DeviceDefaults = {
    ...DEFAULT_DEVICE_DEFAULTS,
    priorities: ['emergency', 'family'],
  };

  it('routes post-signup based on unfinished priorities', () => {
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
    await setDeviceDefaults({ ...base, priorities: ['emergency', 'family'] });

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
    useOnboardingDraftStore.getState().togglePriority('learn');
    mockSetOnboardingComplete.mockResolvedValue(undefined);
    mockEnsureWelcome.mockResolvedValue(undefined);
    mockProfileSave.mockResolvedValue(undefined);
    mockSaveSettings.mockResolvedValue(undefined);

    const defaults = await completePhaseA();
    expect(defaults.countryCode).toBe('NG');
    expect(defaults.languageCode).toBe('yo');
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
      priorities: [],
      emergencyEssentialsDone: true,
      familyPromptDone: true,
    });
    await expect(resolvePostSignupHref()).resolves.toBe('/(app)/setup/done');
  });
});
