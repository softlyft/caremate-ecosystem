import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';

import {
  DEFAULT_DEVICE_DEFAULTS,
  type DeviceDefaults,
  type LocationMode,
  type OnboardingPriorityId,
} from './types';

function normalizeDefaults(raw: Partial<DeviceDefaults> | null | undefined): DeviceDefaults {
  return {
    ...DEFAULT_DEVICE_DEFAULTS,
    ...raw,
    priorities: Array.isArray(raw?.priorities) ? raw.priorities : [],
  };
}

export async function getDeviceDefaults(): Promise<DeviceDefaults> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.deviceDefaults);
    if (!raw) {
      return { ...DEFAULT_DEVICE_DEFAULTS };
    }
    return normalizeDefaults(JSON.parse(raw) as Partial<DeviceDefaults>);
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

export type { DeviceDefaults, LocationMode, OnboardingPriorityId };
