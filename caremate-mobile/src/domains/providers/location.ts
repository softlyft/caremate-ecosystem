import * as Location from 'expo-location';

import { localizationService } from '@/domains/localization';
import { getDeviceDefaults } from '@/domains/onboarding/device-defaults';

export type NearbyCoords = {
  latitude: number;
  longitude: number;
  /** True when using the user's selected country/state pin instead of live GPS. */
  isApproximate: boolean;
};

/**
 * Resolve the coordinates used for Nearby ranking.
 *
 * Priority:
 * 1. Live GPS when onboarding chose "precise" and permission is granted
 * 2. Approximate pin for the selected country (and Nigerian state when set)
 * 3. Same approximate pin if permission is denied or GPS fails
 *
 * There is no Nigeria bounding-box gate — GPS is trusted when available.
 */
export async function resolveNearbyCoords(): Promise<NearbyCoords> {
  try {
    const defaults = await getDeviceDefaults();
    const fallback = localizationService.getFallbackCoords(defaults.countryCode, defaults.state);

    if (defaults.locationMode !== 'precise') {
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
    const fallback = localizationService.getFallbackCoords(defaults?.countryCode, defaults?.state);
    return { ...fallback, isApproximate: true };
  }
}
