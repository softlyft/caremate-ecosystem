import * as Location from 'expo-location';

import { getDeviceDefaults } from '@/domains/onboarding/device-defaults';

/** Lagos Island fallback when GPS is unavailable or outside CareMate launch markets. */
export const DEFAULT_NEARBY_COORDS = {
  latitude: 6.4541,
  longitude: 3.3947,
} as const;

/** Rough Nigeria bounding box — emulator GPS often defaults to California. */
const NIGERIA_BOUNDS = {
  minLat: 4.0,
  maxLat: 14.0,
  minLng: 2.5,
  maxLng: 15.0,
} as const;

export type NearbyCoords = {
  latitude: number;
  longitude: number;
  isApproximate: boolean;
  /** True when device GPS was discarded because it is outside supported region. */
  outsideServiceArea?: boolean;
};

function isInNigeria(latitude: number, longitude: number): boolean {
  return (
    latitude >= NIGERIA_BOUNDS.minLat &&
    latitude <= NIGERIA_BOUNDS.maxLat &&
    longitude >= NIGERIA_BOUNDS.minLng &&
    longitude <= NIGERIA_BOUNDS.maxLng
  );
}

export async function resolveNearbyCoords(): Promise<NearbyCoords> {
  try {
    const defaults = await getDeviceDefaults();
    if (defaults.locationMode === 'approximate') {
      return { ...DEFAULT_NEARBY_COORDS, isApproximate: true };
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return { ...DEFAULT_NEARBY_COORDS, isApproximate: true };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;
    if (!isInNigeria(latitude, longitude)) {
      // Emulators / travelers outside NG would see an empty 25km radius against Lagos seeds.
      return {
        ...DEFAULT_NEARBY_COORDS,
        isApproximate: true,
        outsideServiceArea: true,
      };
    }

    return {
      latitude,
      longitude,
      isApproximate: false,
    };
  } catch {
    return { ...DEFAULT_NEARBY_COORDS, isApproximate: true };
  }
}
