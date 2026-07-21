import { Redirect } from 'expo-router';

/**
 * Emergency QR used to be a standalone placeholder screen.
 * QR now lives on the back of the Patient ID card (Me tab).
 */
export default function EmergencyQrRedirect() {
  return <Redirect href="/(app)/(tabs)/profile" />;
}
