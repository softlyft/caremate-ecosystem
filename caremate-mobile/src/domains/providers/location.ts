import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { GUEST_USER_ID } from '@/constants/guest';
import { locationSampleRepository } from '@/domains/location/repository';
import { getDeviceDefaults, setDeviceDefaults } from '@/domains/onboarding/device-defaults';
import { useAuthStore } from '@/features/auth/store';

export type NearbyLocationPrecision = 'gps' | 'last_known' | 'none';

export type NearbyCoords = {
  latitude: number | null;
  longitude: number | null;
  /** True when using a prior sample instead of a fresh GPS fix. */
  isApproximate: boolean;
  /** How the coordinates were resolved for Nearby ranking. */
  precision: NearbyLocationPrecision;
  /** Whether the user currently wants precise location and OS permission allows it. */
  locationEnabled: boolean;
  /** True when ranking from the latest stored sample because live GPS is off. */
  usingLastKnown: boolean;
  /**
   * True when OS permission is denied and the system will not show the prompt again
   * (`canAskAgain === false`). UI should offer Open Settings instead of Enable.
   */
  permissionBlocked: boolean;
  sampleId?: string;
};

export type EnableNearbyLocationResult = {
  granted: boolean;
  /** True when CareMate opened the system Settings app because the OS will not re-prompt. */
  openedSettings: boolean;
  canAskAgain: boolean;
};

function currentOwnerId(): string {
  const { user, isGuest } = useAuthStore.getState();
  if (isGuest || !user?.id) {
    return GUEST_USER_ID;
  }
  return user.id;
}

function emptyCoords(partial?: Partial<NearbyCoords>): NearbyCoords {
  return {
    latitude: null,
    longitude: null,
    isApproximate: true,
    precision: 'none',
    locationEnabled: false,
    usingLastKnown: false,
    permissionBlocked: false,
    ...partial,
  };
}

async function fromLastKnownSample(options?: {
  locationEnabled?: boolean;
  permissionBlocked?: boolean;
}): Promise<NearbyCoords> {
  const latest = await locationSampleRepository.getLatest(currentOwnerId());
  if (!latest) {
    return emptyCoords({
      locationEnabled: options?.locationEnabled ?? false,
      permissionBlocked: options?.permissionBlocked ?? false,
    });
  }

  return {
    latitude: latest.latitude,
    longitude: latest.longitude,
    isApproximate: true,
    precision: 'last_known',
    locationEnabled: options?.locationEnabled ?? false,
    usingLastKnown: true,
    permissionBlocked: options?.permissionBlocked ?? false,
    sampleId: latest.id,
  };
}

/**
 * Resolve coordinates for Nearby ranking.
 *
 * Priority:
 * 1. Fresh GPS when location mode is precise and permission is already granted
 *    (captures full sample → SQLite last-20 → sync when signed in)
 * 2. Latest stored sample when location is off / denied / GPS fails
 * 3. No usable coords (UI shows enable-location empty state)
 *
 * Does not call `requestForegroundPermissionsAsync` — prompting is reserved for
 * {@link enableNearbyLocationAccess} so denied/`canAskAgain: false` does not look like a no-op.
 */
export async function resolveNearbyCoords(): Promise<NearbyCoords> {
  try {
    const defaults = await getDeviceDefaults();
    const wantsPrecise = defaults.locationMode === 'precise';

    if (!wantsPrecise) {
      return fromLastKnownSample({ locationEnabled: false });
    }

    const permission = await Location.getForegroundPermissionsAsync();
    const permissionBlocked = permission.status !== 'granted' && permission.canAskAgain === false;

    if (permission.status !== 'granted') {
      return fromLastKnownSample({ locationEnabled: false, permissionBlocked });
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const sample = await locationSampleRepository.recordSample(currentOwnerId(), {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      mocked: position.mocked ?? null,
      capturedAt: new Date(position.timestamp).toISOString(),
      source: 'gps',
    });

    return {
      latitude: sample.latitude,
      longitude: sample.longitude,
      isApproximate: false,
      precision: 'gps',
      locationEnabled: true,
      usingLastKnown: false,
      permissionBlocked: false,
      sampleId: sample.id,
    };
  } catch {
    return fromLastKnownSample({ locationEnabled: false });
  }
}

/**
 * Opt into precise Nearby location: persist preference, request OS permission when
 * the system will still show a dialog, otherwise open Settings.
 */
export async function enableNearbyLocationAccess(): Promise<EnableNearbyLocationResult> {
  await setDeviceDefaults({ locationMode: 'precise', locationSkipped: false });

  let permission = await Location.getForegroundPermissionsAsync();

  if (permission.status !== 'granted' && permission.canAskAgain !== false) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status === 'granted') {
    return { granted: true, openedSettings: false, canAskAgain: true };
  }

  const canAskAgain = permission.canAskAgain !== false;
  if (!canAskAgain) {
    await Linking.openSettings();
    return { granted: false, openedSettings: true, canAskAgain: false };
  }

  return { granted: false, openedSettings: false, canAskAgain };
}
