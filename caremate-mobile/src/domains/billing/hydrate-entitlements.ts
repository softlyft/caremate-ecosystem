import { familyRepository } from '@/domains/family/repository';
import { billingRepository } from '@/domains/billing/repository';
import { isOnline } from '@/sync/network';

/**
 * Pull family + subscription entitlements after sign-in / session restore.
 * Required on a new device (empty SQLite) so Premium and AdMob suppression
 * do not wait on the background sync cycle.
 */
export async function hydrateAccountEntitlements(userId: string): Promise<void> {
  if (!userId) {
    return;
  }

  const online = await isOnline();
  if (!online) {
    return;
  }

  // Family first — Family Premium resolution needs a local household membership.
  try {
    await familyRepository.pullFromRemote(userId);
  } catch {
    // Best-effort; personal Premium still works from subscriptions alone.
  }

  try {
    await billingRepository.pullFromRemote();
  } catch {
    // Offline / RLS / network — UI can retry via getPremiumState / refresh.
  }
}
