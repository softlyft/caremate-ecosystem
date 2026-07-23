import { router, type Href } from 'expo-router';

import { takePendingEmergencyShareToken } from '@/domains/emergency/share';

/** After login/register, resume a pending emergency share scan if present. */
export async function continueAfterAuth(fallback: Href = '/(app)/(tabs)'): Promise<void> {
  const token = await takePendingEmergencyShareToken();
  if (token) {
    router.replace(`/emergency/share/${token}`);
    return;
  }
  router.replace(fallback);
}
