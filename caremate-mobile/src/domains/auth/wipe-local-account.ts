import { eq, or } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase, isDatabaseInitialized } from '@/database/client';
import {
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
  userLocationSamples,
} from '@/database/schema';
import { useCheckupPlannerStore } from '@/mini-apps/checkup-planner/store';
import { useImmunizationTrackerStore } from '@/mini-apps/immunization-tracker/store';
import { useMedicationTrackerStore } from '@/mini-apps/medication-tracker/store';
import { usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import { usePregnancyTrackerStore } from '@/mini-apps/pregnancy-tracker/store';
import { useVitalsTrackerStore } from '@/mini-apps/vitals-tracker/store';

/**
 * Remove this user's local SQLite rows and mini-app persist state after account deletion.
 * Catalog rows (articles, providers, tips) are shared and left intact.
 */
export async function wipeLocalAccountData(userId: string): Promise<void> {
  if (!userId || userId === GUEST_USER_ID) {
    return;
  }

  useMedicationTrackerStore.getState().clearAll();
  useVitalsTrackerStore.getState().clearAll();
  useCheckupPlannerStore.getState().clearAll();
  useImmunizationTrackerStore.getState().clearAll();
  usePregnancyTrackerStore.getState().clearAll();
  usePeriodTrackerStore.getState().clearAll();

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
}
