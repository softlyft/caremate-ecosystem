import * as Location from 'expo-location';

import { GUEST_USER_ID } from '@/constants/guest';
import { locationSampleRepository } from '@/domains/location/repository';
import { getDeviceDefaults } from '@/domains/onboarding/device-defaults';
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
  sampleId?: string;
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
    ...partial,
  };
}

async function fromLastKnownSample(options?: {
  locationEnabled?: boolean;
}): Promise<NearbyCoords> {
  const latest = await locationSampleRepository.getLatest(currentOwnerId());
  if (!latest) {
    return emptyCoords({ locationEnabled: options?.locationEnabled ?? false });
  }

  return {
    latitude: latest.latitude,
    longitude: latest.longitude,
    isApproximate: true,
    precision: 'last_known',
    locationEnabled: options?.locationEnabled ?? false,
    usingLastKnown: true,
    sampleId: latest.id,
  };
}

/**
 * Resolve coordinates for Nearby ranking.
 *
 * Priority:
 * 1. Fresh GPS when location mode is precise and permission is granted
 *    (captures full sample → SQLite last-20 → sync when signed in)
 * 2. Latest stored sample when location is off / denied / GPS fails
 * 3. No usable coords (UI shows enable-location empty state)
 *
 * Country/state capital pins are no longer used for Nearby ranking.
 */
export async function resolveNearbyCoords(): Promise<NearbyCoords> {
  try {
    const defaults = await getDeviceDefaults();
    const wantsPrecise = defaults.locationMode === 'precise';

    if (!wantsPrecise) {
      return fromLastKnownSample({ locationEnabled: false });
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return fromLastKnownSample({ locationEnabled: false });
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
      sampleId: sample.id,
    };
  } catch {
    return fromLastKnownSample({ locationEnabled: false });
  }
}
