import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import type { EmergencyLockWidgetSnapshot } from './EmergencyLockWidget.types';

type NativeModule = {
  updateSnapshot(json: string): Promise<void>;
  reload(): Promise<void>;
};

function getNativeModule(): NativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  try {
    return requireNativeModule<NativeModule>('EmergencyLockWidgetNative');
  } catch {
    return null;
  }
}

export async function updateAndroidEmergencyWidget(
  snapshot: EmergencyLockWidgetSnapshot,
): Promise<void> {
  const native = getNativeModule();
  if (!native) {
    return;
  }
  await native.updateSnapshot(JSON.stringify(snapshot));
}

export async function reloadAndroidEmergencyWidget(): Promise<void> {
  await getNativeModule()?.reload();
}

export type { EmergencyLockWidgetSnapshot };
