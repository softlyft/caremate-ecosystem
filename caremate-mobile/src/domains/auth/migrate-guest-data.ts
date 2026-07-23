import { and, eq, isNull } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { isDatabaseInitialized, getDatabase } from '@/database/client';
import {
  articleReads,
  bookmarks,
  familyConnectionRequests,
  familyHouseholds,
  familyMembers,
  syncQueue,
} from '@/database/schema';
import { preferList, preferText } from '@/domains/auth/merge-utils';
import { articleRepository } from '@/domains/articles/repository';
import { emergencyRepository } from '@/domains/emergency/repository';
import { familyRepository } from '@/domains/family/repository';
import { locationSampleRepository } from '@/domains/location/repository';
import { notificationRepository } from '@/domains/notifications/repository';
import { profileRepository } from '@/domains/profile/repository';
import { nowIso, parseJson, stringifyJson } from '@/utils/helpers';

async function rewriteQueuePayloads(
  entityType: string,
  entityId: string,
  rewrite: (payload: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  const db = getDatabase();
  const rows = await db.select().from(syncQueue);
  for (const row of rows) {
    if (row.entityType !== entityType || row.entityId !== entityId) {
      continue;
    }
    const payload = parseJson<Record<string, unknown>>(row.payload, {});
    const next = rewrite(payload);
    await db
      .update(syncQueue)
      .set({
        payload: stringifyJson(next),
        updatedAt: nowIso(),
      })
      .where(eq(syncQueue.id, row.id));
  }
}

async function migrateEmergencyProfile(toUserId: string): Promise<void> {
  const guest = await emergencyRepository.findByUserId(GUEST_USER_ID);
  if (!guest) {
    return;
  }

  const target = await emergencyRepository.findByUserId(toUserId);
  if (!target) {
    await emergencyRepository.save(toUserId, {
      fullName: guest.fullName,
      photoUrl: guest.photoUrl,
      bloodGroup: guest.bloodGroup,
      genotype: guest.genotype,
      allergies: guest.allergies,
      currentMedications: guest.currentMedications,
      chronicConditions: guest.chronicConditions,
      emergencyContacts: guest.emergencyContacts,
      preferredHospital: guest.preferredHospital,
      insuranceProvider: guest.insuranceProvider,
      notes: guest.notes,
    });
    return;
  }

  const merged = {
    fullName: preferText(target.fullName, guest.fullName) ?? target.fullName,
    photoUrl: preferText(target.photoUrl, guest.photoUrl),
    bloodGroup: preferText(target.bloodGroup, guest.bloodGroup),
    genotype: preferText(target.genotype, guest.genotype),
    allergies: preferList(target.allergies, guest.allergies),
    currentMedications: preferList(target.currentMedications, guest.currentMedications),
    chronicConditions: preferList(target.chronicConditions, guest.chronicConditions),
    emergencyContacts: preferList(target.emergencyContacts, guest.emergencyContacts),
    preferredHospital: preferText(target.preferredHospital, guest.preferredHospital),
    insuranceProvider: preferText(target.insuranceProvider, guest.insuranceProvider),
    notes: preferText(target.notes, guest.notes),
  };

  const changed =
    merged.fullName !== target.fullName ||
    merged.photoUrl !== target.photoUrl ||
    merged.bloodGroup !== target.bloodGroup ||
    merged.genotype !== target.genotype ||
    JSON.stringify(merged.allergies) !== JSON.stringify(target.allergies) ||
    JSON.stringify(merged.currentMedications) !== JSON.stringify(target.currentMedications) ||
    JSON.stringify(merged.chronicConditions) !== JSON.stringify(target.chronicConditions) ||
    JSON.stringify(merged.emergencyContacts) !== JSON.stringify(target.emergencyContacts) ||
    merged.preferredHospital !== target.preferredHospital ||
    merged.insuranceProvider !== target.insuranceProvider ||
    merged.notes !== target.notes;

  if (changed) {
    await emergencyRepository.save(toUserId, merged);
  }
}

async function migrateBookmarks(toUserId: string): Promise<void> {
  const db = getDatabase();
  const guestRows = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, GUEST_USER_ID), isNull(bookmarks.deletedAt)));

  for (const row of guestRows) {
    const already = await articleRepository.isBookmarked(toUserId, row.articleId);
    if (already) {
      continue;
    }
    await articleRepository.toggleBookmark(toUserId, row.articleId);
  }
}

async function migrateArticleReads(toUserId: string): Promise<void> {
  const db = getDatabase();
  const guestRows = await db
    .select()
    .from(articleReads)
    .where(and(eq(articleReads.userId, GUEST_USER_ID), isNull(articleReads.deletedAt)));

  for (const row of guestRows) {
    const existing = await articleRepository.getReadStatus(toUserId, row.articleId);
    if (existing === 'read') {
      continue;
    }
    if (row.status === 'read') {
      await articleRepository.markRead(toUserId, row.articleId);
    } else if (!existing) {
      await articleRepository.markReading(toUserId, row.articleId);
    }
  }
}

async function migrateSettings(toUserId: string): Promise<void> {
  const guestSettings = await profileRepository.getSettings(GUEST_USER_ID);
  if (!guestSettings) {
    return;
  }

  const targetSettings = await profileRepository.getSettings(toUserId);
  if (!targetSettings) {
    await profileRepository.saveSettings(toUserId, {
      theme: 'light',
      notificationsEnabled: guestSettings.notificationsEnabled,
      subscribedCategoryIds: guestSettings.subscribedCategoryIds,
    });
    return;
  }

  await profileRepository.saveSettings(toUserId, {
    theme: 'light',
    notificationsEnabled: targetSettings.notificationsEnabled,
    subscribedCategoryIds:
      targetSettings.subscribedCategoryIds.length > 0
        ? targetSettings.subscribedCategoryIds
        : guestSettings.subscribedCategoryIds,
  });
}

async function migrateProfileFields(toUserId: string): Promise<void> {
  const guestProfile = await profileRepository.findByUserId(GUEST_USER_ID);
  if (!guestProfile) {
    return;
  }

  const target = await profileRepository.findByUserId(toUserId);
  if (!target) {
    await profileRepository.save(toUserId, {
      fullName: guestProfile.fullName,
      email: guestProfile.email,
      phone: guestProfile.phone,
      dateOfBirth: guestProfile.dateOfBirth,
      avatarUrl: guestProfile.avatarUrl,
      countryCode: guestProfile.countryCode,
      languageCode: guestProfile.languageCode,
      state: guestProfile.state,
      patientId: guestProfile.patientId,
    });
    return;
  }

  await profileRepository.save(toUserId, {
    countryCode: preferText(target.countryCode, guestProfile.countryCode),
    languageCode: preferText(target.languageCode, guestProfile.languageCode),
    state: preferText(target.state, guestProfile.state),
    dateOfBirth: preferText(target.dateOfBirth, guestProfile.dateOfBirth),
    avatarUrl: preferText(target.avatarUrl, guestProfile.avatarUrl),
  });
}

/**
 * Move guest family ownership onto the signed-in user when they do not already
 * have a household. Guest rows are reassigned (not copied) so cloud sync keeps
 * a single household identity.
 */
async function migrateFamily(toUserId: string): Promise<void> {
  const guestHousehold = await familyRepository.findHouseholdForUser(GUEST_USER_ID);
  if (!guestHousehold) {
    return;
  }

  const userHousehold = await familyRepository.findHouseholdForUser(toUserId);
  if (userHousehold) {
    return;
  }

  const db = getDatabase();
  const timestamp = nowIso();

  await db
    .update(familyHouseholds)
    .set({
      createdByUserId: toUserId,
      syncStatus: 'pending',
      updatedAt: timestamp,
    })
    .where(eq(familyHouseholds.id, guestHousehold.id));

  await rewriteQueuePayloads('family_households', guestHousehold.id, (payload) => ({
    ...payload,
    createdByUserId: toUserId,
  }));

  const members = await db
    .select()
    .from(familyMembers)
    .where(and(eq(familyMembers.householdId, guestHousehold.id), isNull(familyMembers.deletedAt)));

  for (const member of members) {
    if (member.linkedUserId !== GUEST_USER_ID) {
      continue;
    }
    await db
      .update(familyMembers)
      .set({
        linkedUserId: toUserId,
        syncStatus: 'pending',
        updatedAt: timestamp,
      })
      .where(eq(familyMembers.id, member.id));

    await rewriteQueuePayloads('family_members', member.id, (payload) => ({
      ...payload,
      linkedUserId: toUserId,
    }));
  }

  const requests = await db
    .select()
    .from(familyConnectionRequests)
    .where(
      and(
        eq(familyConnectionRequests.householdId, guestHousehold.id),
        isNull(familyConnectionRequests.deletedAt),
      ),
    );

  for (const request of requests) {
    const nextFrom = request.fromUserId === GUEST_USER_ID ? toUserId : request.fromUserId;
    const nextTo = request.toUserId === GUEST_USER_ID ? toUserId : request.toUserId;
    if (nextFrom === request.fromUserId && nextTo === request.toUserId) {
      continue;
    }
    await db
      .update(familyConnectionRequests)
      .set({
        fromUserId: nextFrom,
        toUserId: nextTo,
        syncStatus: 'pending',
        updatedAt: timestamp,
      })
      .where(eq(familyConnectionRequests.id, request.id));

    await rewriteQueuePayloads('family_connection_requests', request.id, (payload) => ({
      ...payload,
      fromUserId: nextFrom,
      toUserId: nextTo,
    }));
  }
}

/**
 * Copy/merge guest-scoped SQLite rows onto a newly signed-in account so local
 * guest work is not lost. Mini-app AsyncStorage → snapshot migration stays in
 * `migrateMiniAppsToSnapshots`.
 */
export async function migrateGuestLocalData(toUserId: string): Promise<void> {
  if (!isDatabaseInitialized() || !toUserId || toUserId === GUEST_USER_ID) {
    return;
  }

  await migrateEmergencyProfile(toUserId);
  await migrateBookmarks(toUserId);
  await migrateArticleReads(toUserId);
  await migrateSettings(toUserId);
  await migrateProfileFields(toUserId);
  await migrateFamily(toUserId);
  await locationSampleRepository.migrateGuestSamples(toUserId);
  await notificationRepository.migrateGuestToUser(toUserId, GUEST_USER_ID);
}
