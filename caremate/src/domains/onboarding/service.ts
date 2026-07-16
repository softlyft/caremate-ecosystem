import type { Href } from 'expo-router';

import { GUEST_USER_ID } from '@/constants/guest';
import { ensureWelcomeInAppNotification } from '@/domains/notifications/service';
import { authService } from '@/services/auth-service';
import { localizationService } from '@/domains/localization';
import { useSettingsStore } from '@/domains/profile/store';
import { profileRepository } from '@/domains/profile/repository';
import { useAuthStore } from '@/features/auth/store';

import { getDeviceDefaults, setDeviceDefaults } from './device-defaults';
import { useOnboardingDraftStore } from './store';
import type { DeviceDefaults } from './types';

/** Persist Phase A draft to device defaults and mark onboarding complete. */
export async function completePhaseA(): Promise<DeviceDefaults> {
  const draft = useOnboardingDraftStore.getState();
  const languageCode = localizationService.normalizeLanguage(draft.countryCode, draft.languageCode);

  const defaults = await setDeviceDefaults({
    countryCode: draft.countryCode,
    languageCode,
    state: draft.state.trim() || null,
    locationMode: draft.locationMode ?? 'approximate',
    priorities: draft.priorities,
    notificationsEnabled: draft.notificationsEnabled,
    locationSkipped: draft.locationSkipped,
  });

  useSettingsStore.getState().setNotificationsEnabled(defaults.notificationsEnabled);
  await authService.setOnboardingComplete(true);

  const userId = useAuthStore.getState().user?.id ?? GUEST_USER_ID;
  await ensureWelcomeInAppNotification({
    userId,
    languageCode,
  });

  return defaults;
}

/** Copy device country/language defaults onto a freshly created profile. */
export async function applyDeviceDefaultsToProfile(userId: string): Promise<void> {
  const defaults = await getDeviceDefaults();
  await profileRepository.save(userId, {
    countryCode: defaults.countryCode,
    languageCode: defaults.languageCode,
    state: defaults.state,
  });
  await profileRepository.saveSettings(userId, {
    notificationsEnabled: defaults.notificationsEnabled,
  });
  useSettingsStore.getState().setNotificationsEnabled(defaults.notificationsEnabled);
}

export function getPostSignupHref(defaults: DeviceDefaults): Href {
  if (defaults.priorities.includes('emergency') && !defaults.emergencyEssentialsDone) {
    return '/(app)/setup/emergency';
  }
  if (defaults.priorities.includes('family') && !defaults.familyPromptDone) {
    return '/(app)/setup/family-prompt';
  }
  return '/(app)/setup/done';
}

export async function resolvePostSignupHref(): Promise<Href> {
  const defaults = await getDeviceDefaults();
  return getPostSignupHref(defaults);
}

export async function markEmergencyEssentialsDone(): Promise<Href> {
  const defaults = await setDeviceDefaults({ emergencyEssentialsDone: true });
  return getPostSignupHref(defaults);
}

export async function markFamilyPromptDone(): Promise<Href> {
  await setDeviceDefaults({ familyPromptDone: true });
  return '/(app)/setup/done';
}

export type FinishSetupItem = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  href: Href;
};

export async function getFinishSetupItems(options: {
  isGuest: boolean;
  hasCountry: boolean;
  hasEmergencyEssentials: boolean;
  hasHousehold: boolean;
}): Promise<FinishSetupItem[]> {
  const defaults = await getDeviceDefaults();
  const items: FinishSetupItem[] = [];

  if (!options.hasCountry) {
    items.push({
      id: 'country',
      titleKey: 'setup.finishItems.country.title',
      subtitleKey: 'setup.finishItems.country.subtitle',
      href: options.isGuest ? '/(auth)/login' : '/(app)/profile/settings',
    });
  }

  if (options.isGuest) {
    if (defaults.priorities.includes('emergency')) {
      items.push({
        id: 'account-emergency',
        titleKey: 'setup.finishItems.accountEmergency.title',
        subtitleKey: 'setup.finishItems.accountEmergency.subtitle',
        href: '/(auth)/register',
      });
    }
    if (defaults.priorities.includes('family')) {
      items.push({
        id: 'account-family',
        titleKey: 'setup.finishItems.accountFamily.title',
        subtitleKey: 'setup.finishItems.accountFamily.subtitle',
        href: '/(auth)/register',
      });
    }
    return items;
  }

  if (!options.hasEmergencyEssentials) {
    items.push({
      id: 'emergency',
      titleKey: 'setup.finishItems.emergency.title',
      subtitleKey: 'setup.finishItems.emergency.subtitle',
      href: '/(app)/setup/emergency',
    });
  }

  if (defaults.priorities.includes('family') && !options.hasHousehold) {
    items.push({
      id: 'family',
      titleKey: 'setup.finishItems.family.title',
      subtitleKey: 'setup.finishItems.family.subtitle',
      href: '/(app)/family/setup',
    });
  }

  return items;
}
