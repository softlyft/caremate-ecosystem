import AsyncStorage from '@react-native-async-storage/async-storage';

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

/** Kept for tests / migration helpers — widgets no longer display this data. */
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

/** @deprecated Lock/home widgets are retired; always false. */
export async function isEmergencyLockSurfaceEnabled(): Promise<boolean> {
  return false;
}

/** @deprecated Clears the legacy enable flag; widgets stay empty. */
export async function setEmergencyLockSurfaceEnabled(_enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
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

async function updateNativeWidget(_snapshot: EmergencyLockSnapshot): Promise<void> {
  // Home/lock widgets retired — no native widget updates.
}

/**
 * Always clears lock/home widget PHI. Profile argument is ignored — emergency
 * details stay in-app only and are shared via Patient ID QR after account login.
 */
export async function syncEmergencyLockSurface(_profile?: EmergencyProfile | null): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
  const snapshot = { ...EMPTY_SNAPSHOT, updatedAt: new Date().toISOString() };
  await writeEmergencyLockSnapshot(snapshot);
  await updateNativeWidget(snapshot);
}
