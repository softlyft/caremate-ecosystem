import { useSettingsStore } from '@/domains/profile/store';
import { profileRepository } from '@/domains/profile/repository';

import { getDeviceDefaults } from './device-defaults';

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
