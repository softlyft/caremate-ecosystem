import { eq, or } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase, isDatabaseInitialized } from '@/database/client';
import {
  adEvents,
  analyticsQueue,
  articleReads,
  bookmarks,
  emergencyProfiles,
  familyConnectionRequests,
  familyHouseholds,
  familyMembers,
  miniAppSnapshots,
  notifications,
  profiles,
  settings,
  subscriptionEntitlements,
  syncQueue,
  userLocationSamples,
} from '@/database/schema';
import { syncEmergencyLockSurface } from '@/domains/emergency/lock-surface';
import { useCheckupPlannerStore } from '@/mini-apps/checkup-planner/store';
import { useImmunizationTrackerStore } from '@/mini-apps/immunization-tracker/store';
import { useMedicationTrackerStore } from '@/mini-apps/medication-tracker/store';
import { usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import { usePregnancyTrackerStore } from '@/mini-apps/pregnancy-tracker/store';
import { useVitalsTrackerStore } from '@/mini-apps/vitals-tracker/store';
import { clearMiniAppAsyncStorage } from '@/mini-apps/_kit/synced-storage';

function clearMiniAppStores(): void {
  useMedicationTrackerStore.getState().clearAll();
  useVitalsTrackerStore.getState().clearAll();
  useCheckupPlannerStore.getState().clearAll();
  useImmunizationTrackerStore.getState().clearAll();
  usePregnancyTrackerStore.getState().clearAll();
  usePeriodTrackerStore.getState().clearAll();
}

/**
 * Clear in-memory + AsyncStorage mini-app state and emergency lock surface.
 * Used on sign-out and account deletion so the next account cannot inherit PHI.
 */
export async function clearSessionDeviceState(userId?: string | null): Promise<void> {
  clearMiniAppStores();
  await clearMiniAppAsyncStorage(userId);
  try {
    await syncEmergencyLockSurface(null);
  } catch {
    // Widget/lock surface is best-effort.
  }
}

/**
 * Remove this user's local SQLite rows, queues, mini-app persist, and lock surface.
 * Catalog rows (articles, providers, tips) are shared and left intact.
 */
export async function wipeLocalAccountData(userId: string): Promise<void> {
  if (!userId || userId === GUEST_USER_ID) {
    return;
  }

  await clearSessionDeviceState(userId);

  if (!isDatabaseInitialized()) {
    return;
  }

  const db = getDatabase();

  const ownedHouseholds = await db
    .select({ id: familyHouseholds.id })
    .from(familyHouseholds)
    .where(eq(familyHouseholds.createdByUserId, userId));

  for (const household of ownedHouseholds) {
    await db.delete(familyMembers).where(eq(familyMembers.householdId, household.id));
    await db
      .delete(familyConnectionRequests)
      .where(eq(familyConnectionRequests.householdId, household.id));
  }

  await db.delete(familyHouseholds).where(eq(familyHouseholds.createdByUserId, userId));
  await db.delete(familyMembers).where(eq(familyMembers.linkedUserId, userId));
  await db
    .delete(familyConnectionRequests)
    .where(
      or(
        eq(familyConnectionRequests.fromUserId, userId),
        eq(familyConnectionRequests.toUserId, userId),
      ),
    );

  await db.delete(profiles).where(eq(profiles.userId, userId));
  await db.delete(emergencyProfiles).where(eq(emergencyProfiles.userId, userId));
  await db.delete(bookmarks).where(eq(bookmarks.userId, userId));
  await db.delete(articleReads).where(eq(articleReads.userId, userId));
  await db.delete(settings).where(eq(settings.userId, userId));
  await db.delete(miniAppSnapshots).where(eq(miniAppSnapshots.userId, userId));
  await db.delete(subscriptionEntitlements).where(eq(subscriptionEntitlements.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(userLocationSamples).where(eq(userLocationSamples.userId, userId));
  await db.delete(adEvents).where(eq(adEvents.userId, userId));
  await db.delete(analyticsQueue).where(eq(analyticsQueue.distinctId, userId));
  // Device-local mutation outbox — clear entirely so payloads cannot re-fire for a deleted user.
  await db.delete(syncQueue);
}
