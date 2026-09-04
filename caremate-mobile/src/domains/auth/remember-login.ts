import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';
import { normalizeAccountEmail } from '@/domains/auth/device-account-binding';

/** Load a previously saved login email when Remember me was checked. */
export async function getRememberedLoginEmail(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.rememberedLoginEmail);
    if (!raw?.trim()) return null;
    return normalizeAccountEmail(raw);
  } catch {
    return null;
  }
}

/** Persist or clear the login email based on the Remember me checkbox. */
export async function setRememberedLoginEmail(
  email: string | null,
  remember: boolean,
): Promise<void> {
  try {
    if (!remember || !email?.trim()) {
      await AsyncStorage.removeItem(STORAGE_KEYS.rememberedLoginEmail);
      return;
    }
    await AsyncStorage.setItem(
      STORAGE_KEYS.rememberedLoginEmail,
      normalizeAccountEmail(email),
    );
  } catch {
    // Best-effort preference; login still succeeds without it.
  }
}
