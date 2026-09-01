import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';

import { DEFAULT_DEVICE_DEFAULTS, type DeviceDefaults, type LocationMode } from './types';

type LegacyDeviceDefaults = Partial<DeviceDefaults> & {
  priorities?: string[];
};

function migrateLegacyDefaults(raw: LegacyDeviceDefaults): Partial<DeviceDefaults> {
  const { priorities, ...rest } = raw;
  const patch: Partial<DeviceDefaults> = { ...rest };

  if (Array.isArray(priorities)) {
    if (patch.wantsFamily == null && priorities.includes('family')) {
      patch.wantsFamily = true;
    }
    if (patch.emergencyBasicsStarted == null && priorities.includes('emergency')) {
      patch.emergencyBasicsStarted = false;
    }
  }

  return patch;
}

function normalizeDefaults(raw: LegacyDeviceDefaults | null | undefined): DeviceDefaults {
  const migrated = raw ? migrateLegacyDefaults(raw) : {};
  return {
    ...DEFAULT_DEVICE_DEFAULTS,
    ...migrated,
    emergencyBasicsStarted: Boolean(migrated.emergencyBasicsStarted),
    wantsFamily: Boolean(migrated.wantsFamily),
    emergencyEssentialsDone: Boolean(migrated.emergencyEssentialsDone),
    familyPromptDone: Boolean(migrated.familyPromptDone),
    locationSkipped: Boolean(migrated.locationSkipped),
    notificationsEnabled: migrated.notificationsEnabled ?? DEFAULT_DEVICE_DEFAULTS.notificationsEnabled,
  };
}

export async function getDeviceDefaults(): Promise<DeviceDefaults> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.deviceDefaults);
    if (!raw) {
      return { ...DEFAULT_DEVICE_DEFAULTS };
    }
    return normalizeDefaults(JSON.parse(raw) as LegacyDeviceDefaults);
  } catch {
    return { ...DEFAULT_DEVICE_DEFAULTS };
  }
}

export async function setDeviceDefaults(patch: Partial<DeviceDefaults>): Promise<DeviceDefaults> {
  const current = await getDeviceDefaults();
  const next = normalizeDefaults({ ...current, ...patch });
  await AsyncStorage.setItem(STORAGE_KEYS.deviceDefaults, JSON.stringify(next));
  return next;
}

export async function updateDeviceDefaults(
  updater: (current: DeviceDefaults) => DeviceDefaults,
): Promise<DeviceDefaults> {
  const current = await getDeviceDefaults();
  const next = normalizeDefaults(updater(current));
  await AsyncStorage.setItem(STORAGE_KEYS.deviceDefaults, JSON.stringify(next));
  return next;
}

export type { DeviceDefaults, LocationMode };
