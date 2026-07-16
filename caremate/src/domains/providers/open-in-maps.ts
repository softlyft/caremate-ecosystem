import { Linking, Platform } from 'react-native';

type OpenInMapsParams = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
};

export function canOpenInMaps(params: OpenInMapsParams): boolean {
  const hasAddress = Boolean(params.address?.trim());
  const hasCoords =
    params.latitude != null &&
    params.longitude != null &&
    Number.isFinite(params.latitude) &&
    Number.isFinite(params.longitude);
  return hasAddress || hasCoords;
}

/**
 * Opens the provider location in the device's default maps app (outside CareMate).
 * Prefers a street address query; falls back to coordinates.
 */
export async function openInExternalMaps(params: OpenInMapsParams): Promise<void> {
  const address = params.address?.trim() || null;
  const label = (params.label?.trim() || address || 'Destination').slice(0, 120);
  const hasCoords =
    params.latitude != null &&
    params.longitude != null &&
    Number.isFinite(params.latitude) &&
    Number.isFinite(params.longitude);

  if (!address && !hasCoords) {
    return;
  }

  if (Platform.OS === 'ios') {
    if (address) {
      await Linking.openURL(`http://maps.apple.com/?q=${encodeURIComponent(address)}`);
      return;
    }
    await Linking.openURL(
      `http://maps.apple.com/?ll=${params.latitude},${params.longitude}&q=${encodeURIComponent(label)}`,
    );
    return;
  }

  if (Platform.OS === 'android') {
    // `geo:` hands off to the user's default maps app.
    if (address) {
      await Linking.openURL(`geo:0,0?q=${encodeURIComponent(address)}`);
      return;
    }
    await Linking.openURL(
      `geo:${params.latitude},${params.longitude}?q=${params.latitude},${params.longitude}(${encodeURIComponent(label)})`,
    );
    return;
  }

  if (address) {
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    );
    return;
  }

  await Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`,
  );
}
