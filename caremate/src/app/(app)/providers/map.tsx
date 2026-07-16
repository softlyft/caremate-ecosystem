import { Redirect } from 'expo-router';

/**
 * In-app map list was retired. Open a provider and use “Open in Maps”
 * to launch the device's default maps app with the provider address.
 */
export default function ProvidersMapRedirect() {
  return <Redirect href="/(app)/(tabs)/providers" />;
}
