import type { Href } from 'expo-router';

import { authService } from '@/services/auth-service';
import { useSettingsStore } from '@/domains/profile/store';
import { profileRepository } from '@/domains/profile/repository';

import { getDeviceDefaults, setDeviceDefaults } from './device-defaults';
import { useOnboardingDraftStore } from './store';
import type { DeviceDefaults } from './types';

/** Persist Phase A draft to device defaults and mark onboarding complete. */
export async function completePhaseA(): Promise<DeviceDefaults> {
  const draft = useOnboardingDraftStore.getState();

  const defaults = await setDeviceDefaults({
    countryCode: draft.regionSkipped ? null : draft.countryCode,
    state: draft.regionSkipped ? null : draft.state.trim() || null,
    locationMode: draft.locationMode ?? 'approximate',
    priorities: draft.priorities,
    notificationsEnabled: draft.notificationsEnabled,
    regionSkipped: draft.regionSkipped,
    locationSkipped: draft.locationSkipped,
  });

  useSettingsStore.getState().setNotificationsEnabled(defaults.notificationsEnabled);
  await authService.setOnboardingComplete(true);
  return defaults;
}

/** Copy device region + notification defaults onto a freshly created profile. */
export async function applyDeviceDefaultsToProfile(userId: string): Promise<void> {
  const defaults = await getDeviceDefaults();
  await profileRepository.save(userId, {
    countryCode: defaults.countryCode,
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
  title: string;
  subtitle: string;
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

  if (!options.hasCountry && (defaults.regionSkipped || !defaults.countryCode)) {
    items.push({
      id: 'region',
      title: 'Set your region',
      subtitle: 'Get local health news for your country',
      href: options.isGuest ? '/(auth)/login' : '/(app)/profile/settings',
    });
  }

  if (options.isGuest) {
    if (defaults.priorities.includes('emergency')) {
      items.push({
        id: 'account-emergency',
        title: 'Save an emergency profile',
        subtitle: 'Create an account so your offline card can sync',
        href: '/(auth)/register',
      });
    }
    if (defaults.priorities.includes('family')) {
      items.push({
        id: 'account-family',
        title: 'Set up family care',
        subtitle: 'Sign in to add kids and share a household',
        href: '/(auth)/register',
      });
    }
    return items;
  }

  if (!options.hasEmergencyEssentials) {
    items.push({
      id: 'emergency',
      title: 'Finish emergency essentials',
      subtitle: 'Blood group, genotype, and one ICE contact',
      href: '/(app)/setup/emergency',
    });
  }

  if (defaults.priorities.includes('family') && !options.hasHousehold) {
    items.push({
      id: 'family',
      title: 'Set up your household',
      subtitle: 'Add kids for immunization and shared care',
      href: '/(app)/family/setup',
    });
  }

  return items;
}
