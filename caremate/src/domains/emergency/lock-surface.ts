import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { EmergencyLockWidgetProps } from '@/widgets/emergency-lock-widget-types';
import type { EmergencyContact, EmergencyProfile } from '@/types';

const SNAPSHOT_KEY = 'caremate_emergency_lock_snapshot';
const ENABLED_KEY = 'caremate_emergency_lock_enabled';

export type EmergencyLockSnapshot = EmergencyLockWidgetProps & {
  updatedAt: string;
};

const EMPTY_SNAPSHOT: EmergencyLockSnapshot = {
  hasProfile: false,
  fullName: '',
  bloodGroup: '',
  genotype: '',
  allergies: '',
  contactName: '',
  contactPhone: '',
  contactRelationship: '',
  updatedAt: new Date(0).toISOString(),
};

function primaryContact(contacts: EmergencyContact[]): EmergencyContact | null {
  return contacts[0] ?? null;
}

export function buildEmergencyLockSnapshot(
  profile: EmergencyProfile | null,
): EmergencyLockSnapshot {
  if (!profile) {
    return { ...EMPTY_SNAPSHOT, updatedAt: new Date().toISOString() };
  }

  const contact = primaryContact(profile.emergencyContacts);
  const allergies = profile.allergies.slice(0, 3).join(', ');

  return {
    hasProfile: true,
    fullName: profile.fullName.trim() || 'CareMate user',
    bloodGroup: profile.bloodGroup?.trim() || '',
    genotype: profile.genotype?.trim() || '',
    allergies,
    contactName: contact?.name.trim() || '',
    contactPhone: contact?.phone.trim() || '',
    contactRelationship: contact?.relationship.trim() || '',
    updatedAt: new Date().toISOString(),
  };
}

export async function isEmergencyLockSurfaceEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ENABLED_KEY);
  // Default on so saving a profile surfaces lock info unless the user opts out.
  return value !== 'false';
}

export async function setEmergencyLockSurfaceEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function readEmergencyLockSnapshot(): Promise<EmergencyLockSnapshot> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return EMPTY_SNAPSHOT;
  }
  try {
    return { ...EMPTY_SNAPSHOT, ...(JSON.parse(raw) as EmergencyLockSnapshot) };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

async function writeEmergencyLockSnapshot(snapshot: EmergencyLockSnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

async function updateNativeWidget(snapshot: EmergencyLockSnapshot): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const { updatedAt: _updatedAt, ...props } = snapshot;

  try {
    if (Platform.OS === 'android') {
      const { updateAndroidEmergencyWidget } = await import('emergency-lock-widget');
      await updateAndroidEmergencyWidget(props);
      return;
    }

    const EmergencyLockWidget = (await import('@/widgets/EmergencyLockWidget')).default;
    EmergencyLockWidget.updateSnapshot(props);
  } catch {
    // Widgets require a development/production build; ignore in Expo Go / unsupported runtimes.
  }
}

/** Persists a minimal emergency card and refreshes the lock/home screen widget. */
export async function syncEmergencyLockSurface(profile: EmergencyProfile | null): Promise<void> {
  const enabled = await isEmergencyLockSurfaceEnabled();
  const snapshot = enabled
    ? buildEmergencyLockSnapshot(profile)
    : { ...EMPTY_SNAPSHOT, updatedAt: new Date().toISOString() };

  await writeEmergencyLockSnapshot(snapshot);
  await updateNativeWidget(snapshot);
}
