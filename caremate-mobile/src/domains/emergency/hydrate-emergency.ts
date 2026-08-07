import { emergencyRepository } from '@/domains/emergency/repository';
import { isOnline } from '@/sync/network';

/**
 * Pull emergency profile after sign-in / session restore and merge into SQLite.
 * Required on a new device or after clear-data so cloud PHI is restored before
 * bootstrap creates an empty local shell.
 */
export async function hydrateEmergencyProfile(userId: string): Promise<void> {
  if (!userId) {
    return;
  }

  const online = await isOnline();
  if (!online) {
    return;
  }

  try {
    await emergencyRepository.hydrateFromRemote(userId);
  } catch {
    // Best-effort; sync engine will retry. Auth must still succeed.
  }
}
