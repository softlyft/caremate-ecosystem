import * as Location from 'expo-location';

import { localizationService } from '@/domains/localization';
import { getDeviceDefaults } from '@/domains/onboarding/device-defaults';

export const DEFAULT_NEARBY_COORDS = {
  latitude: 0,
  longitude: 0,
} as const;

export type NearbyCoords = {
  latitude: number;
  longitude: number;
  isApproximate: boolean;
  /** True when device GPS was discarded because it is outside supported region. */
  outsideServiceArea?: boolean;
};

export async function resolveNearbyCoords(): Promise<NearbyCoords> {
  try {
    const defaults = await getDeviceDefaults();
    const fallback = localizationService.getFallbackCoords(defaults.countryCode);
    if (defaults.locationMode === 'approximate') {
      return { ...fallback, isApproximate: true };
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return { ...fallback, isApproximate: true };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      isApproximate: false,
    };
  } catch {
    const defaults = await getDeviceDefaults().catch(() => null);
    const fallback = localizationService.getFallbackCoords(defaults?.countryCode);
    return { ...fallback, isApproximate: true, outsideServiceArea: true };
  }
}
