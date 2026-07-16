import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { profiles, settings } from '@/database/schema';
import { generatePatientIdDigits, isValidPatientId } from '@/domains/profile/patient-id';
import { config } from '@/constants/env';
import { GUEST_USER_ID } from '@/constants/guest';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { isOnline } from '@/sync/network';
import { removeSyncOperationsForEntity } from '@/sync/queue';
import type { AppSettings, Profile } from '@/types';
import { createId, nowIso, parseJsonArray } from '@/utils/helpers';

function mapProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.dateOfBirth,
    avatarUrl: row.avatarUrl,
    countryCode: row.countryCode ?? null,
    languageCode: row.languageCode ?? null,
    state: row.state ?? null,
    patientId: row.patientId ?? null,
    syncStatus: row.syncStatus as Profile['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSettings(row: typeof settings.$inferSelect): AppSettings {
  return {
    id: row.id,
    userId: row.userId,
    theme: row.theme as AppSettings['theme'],
    notificationsEnabled: row.notificationsEnabled,
    subscribedCategoryIds: parseJsonArray<string>(row.subscribedCategoryIds),
    syncStatus: row.syncStatus as AppSettings['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class ProfileRepository extends BaseRepository {
  async findByUserId(userId: string): Promise<Profile | null> {
    const db = getDatabase();
    // If duplicates ever exist (login stub + pulled remote row), prefer the one
    // holding a Patient ID, then the oldest, so the answer is deterministic.
    const [row] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
      .orderBy(
        sql`CASE WHEN ${profiles.patientId} IS NOT NULL THEN 0 ELSE 1 END`,
        asc(profiles.createdAt),
      )
      .limit(1);
    return row ? mapProfile(row) : null;
  }

  async findByPatientId(patientId: string): Promise<Profile | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.patientId, patientId), isNull(profiles.deletedAt)))
      .limit(1);
    return row ? mapProfile(row) : null;
  }

  async save(userId: string, input: Partial<Profile>): Promise<Profile> {
    const db = getDatabase();
    const existing = await this.findByUserId(userId);
    const timestamp = nowIso();

    if (existing) {
      const updated: Profile = {
        ...existing,
        ...input,
        // Never accidentally clear an existing patient ID unless explicitly passed null.
        patientId: input.patientId !== undefined ? input.patientId : existing.patientId,
        updatedAt: timestamp,
        syncStatus: 'pending',
      };

      await db
        .update(profiles)
        .set({
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          dateOfBirth: updated.dateOfBirth,
          avatarUrl: updated.avatarUrl,
          countryCode: updated.countryCode,
          languageCode: updated.languageCode,
          state: updated.state,
          patientId: updated.patientId,
          syncStatus: 'pending',
          updatedAt: timestamp,
        })
        .where(eq(profiles.id, existing.id));

      await this.queueSync({
        entityType: 'profiles',
        entityId: existing.id,
        operation: 'update',
        payload: updated,
      });

      return updated;
    }

    const id = await createId();
    const profile: Profile = {
      id,
      userId,
      fullName: input.fullName ?? '',
      email: input.email ?? null,
      phone: input.phone ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      avatarUrl: input.avatarUrl ?? null,
      countryCode: input.countryCode ?? null,
      languageCode: input.languageCode ?? null,
      state: input.state ?? null,
      patientId: input.patientId ?? null,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(profiles).values({
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      avatarUrl: profile.avatarUrl,
      countryCode: profile.countryCode,
      languageCode: profile.languageCode,
      state: profile.state,
      patientId: profile.patientId,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'profiles',
      entityId: profile.id,
      operation: 'create',
      payload: profile,
    });

    return profile;
  }

  /**
   * Mint a unique CareMate Patient ID for an account that does not have one yet.
   * Does not run at signup — call from Profile "Generate ID for me".
   */
  async generatePatientIdForUser(userId: string): Promise<Profile> {
    const existing = await this.findByUserId(userId);
    if (existing && isValidPatientId(existing.patientId)) {
      return existing;
    }

    const online = config.isSupabaseConfigured && (await isOnline());

    // The account may already own an ID minted on another device / install.
    // Adopt it instead of minting a second one.
    if (online && userId !== GUEST_USER_ID) {
      const { data: remoteProfile } = await supabase
        .from('profiles')
        .select('patient_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (remoteProfile && isValidPatientId(remoteProfile.patient_id)) {
        return this.save(userId, { patientId: remoteProfile.patient_id });
      }
    }

    const maxAttempts = 12;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = await generatePatientIdDigits();
      const localHit = await this.findByPatientId(candidate);
      if (localHit && localHit.userId !== userId) {
        continue;
      }

      if (online) {
        const { data: remoteHit, error } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('patient_id', candidate)
          .maybeSingle();
        if (error) {
          throw new Error(error.message);
        }
        if (remoteHit && remoteHit.user_id !== userId) {
          continue;
        }
      }

      return this.save(userId, { patientId: candidate });
    }

    throw new Error('Could not allocate a unique Patient ID. Please try again.');
  }

  async getSettings(userId: string): Promise<AppSettings | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), isNull(settings.deletedAt)))
      .limit(1);
    return row ? mapSettings(row) : null;
  }

  async saveSettings(userId: string, input: Partial<AppSettings>): Promise<AppSettings> {
    const db = getDatabase();
    const existing = await this.getSettings(userId);
    const timestamp = nowIso();

    if (existing) {
      const updated: AppSettings = {
        ...existing,
        ...input,
        updatedAt: timestamp,
        syncStatus: 'pending',
      };

      await db
        .update(settings)
        .set({
          theme: updated.theme,
          notificationsEnabled: updated.notificationsEnabled,
          subscribedCategoryIds: JSON.stringify(updated.subscribedCategoryIds),
          syncStatus: 'pending',
          updatedAt: timestamp,
        })
        .where(eq(settings.id, existing.id));

      await this.queueSync({
        entityType: 'settings',
        entityId: existing.id,
        operation: 'update',
        payload: updated,
      });

      return updated;
    }

    const id = await createId();
    const appSettings: AppSettings = {
      id,
      userId,
      theme: input.theme ?? 'system',
      notificationsEnabled: input.notificationsEnabled ?? true,
      subscribedCategoryIds: input.subscribedCategoryIds ?? [],
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(settings).values({
      id: appSettings.id,
      userId: appSettings.userId,
      theme: appSettings.theme,
      notificationsEnabled: appSettings.notificationsEnabled,
      subscribedCategoryIds: JSON.stringify(appSettings.subscribedCategoryIds),
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'settings',
      entityId: appSettings.id,
      operation: 'create',
      payload: appSettings,
    });

    return appSettings;
  }

  async syncToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      await supabase.from('profiles').delete().eq('id', entityId);
      return;
    }

    const profile = payload as Profile;
    await supabase.from('profiles').upsert({
      id: profile.id,
      user_id: profile.userId,
      full_name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      date_of_birth: profile.dateOfBirth,
      avatar_url: profile.avatarUrl,
      country_code: profile.countryCode,
      language_code: profile.languageCode,
      state: profile.state,
      // Patient IDs are permanent once minted — a device that hasn't pulled the
      // ID yet must never overwrite the remote value with null.
      ...(isValidPatientId(profile.patientId) ? { patient_id: profile.patientId } : {}),
      updated_at: profile.updatedAt,
    });
  }

  async syncSettingsToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      await supabase.from('settings').delete().eq('id', entityId);
      return;
    }

    const appSettings = payload as AppSettings;
    await supabase.from('settings').upsert({
      id: appSettings.id,
      user_id: appSettings.userId,
      theme: appSettings.theme,
      notifications_enabled: appSettings.notificationsEnabled,
      subscribed_category_ids: appSettings.subscribedCategoryIds,
      updated_at: appSettings.updatedAt,
    });
  }

  async pullFromRemote(): Promise<void> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data) {
      return;
    }

    const db = getDatabase();
    for (const row of data) {
      const timestamp = nowIso();
      await db
        .insert(profiles)
        .values({
          id: row.id,
          userId: row.user_id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.date_of_birth,
          avatarUrl: row.avatar_url,
          countryCode: row.country_code ?? null,
          languageCode: row.language_code ?? null,
          state: row.state ?? null,
          patientId: row.patient_id ?? null,
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            fullName: row.full_name,
            email: row.email,
            phone: row.phone,
            dateOfBirth: row.date_of_birth,
            avatarUrl: row.avatar_url,
            countryCode: row.country_code ?? null,
            languageCode: row.language_code ?? null,
            state: row.state ?? null,
            patientId: row.patient_id ?? null,
            syncStatus: 'synced',
            updatedAt: row.updated_at ?? timestamp,
          },
        });

      await this.reconcileDuplicateLocalRows(row.user_id, row.id);
    }
  }

  /**
   * A fresh login bootstraps a local profile stub with a new random id before
   * the remote row is pulled, leaving two local rows for one account. Keep the
   * remote (canonical) row, salvage anything only the stub knows — most
   * importantly a Patient ID minted offline — and drop the stub plus any of
   * its queued pushes (they would violate the remote user_id uniqueness).
   */
  private async reconcileDuplicateLocalRows(userId: string, canonicalId: string): Promise<void> {
    const db = getDatabase();
    const dupes = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), ne(profiles.id, canonicalId)));

    if (dupes.length === 0) {
      return;
    }

    const [canonical] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, canonicalId))
      .limit(1);
    if (!canonical) {
      return;
    }

    const fill = <T>(current: T | null, candidate: T | null): T | null =>
      current ?? candidate ?? null;

    let merged = mapProfile(canonical);
    let changed = false;
    for (const dupe of dupes) {
      const next: Profile = {
        ...merged,
        fullName: merged.fullName.trim() ? merged.fullName : dupe.fullName,
        email: fill(merged.email, dupe.email),
        phone: fill(merged.phone, dupe.phone),
        dateOfBirth: fill(merged.dateOfBirth, dupe.dateOfBirth),
        avatarUrl: fill(merged.avatarUrl, dupe.avatarUrl),
        countryCode: fill(merged.countryCode, dupe.countryCode),
        languageCode: fill(merged.languageCode, dupe.languageCode),
        state: fill(merged.state, dupe.state),
        patientId: isValidPatientId(merged.patientId)
          ? merged.patientId
          : isValidPatientId(dupe.patientId)
            ? dupe.patientId
            : merged.patientId,
      };
      if (JSON.stringify(next) !== JSON.stringify(merged)) {
        merged = next;
        changed = true;
      }

      await db.delete(profiles).where(eq(profiles.id, dupe.id));
      await removeSyncOperationsForEntity('profiles', dupe.id);
    }

    if (changed) {
      const timestamp = nowIso();
      merged = { ...merged, syncStatus: 'pending', updatedAt: timestamp };
      await db
        .update(profiles)
        .set({
          fullName: merged.fullName,
          email: merged.email,
          phone: merged.phone,
          dateOfBirth: merged.dateOfBirth,
          avatarUrl: merged.avatarUrl,
          countryCode: merged.countryCode,
          languageCode: merged.languageCode,
          state: merged.state,
          patientId: merged.patientId,
          syncStatus: 'pending',
          updatedAt: timestamp,
        })
        .where(eq(profiles.id, canonicalId));

      await this.queueSync({
        entityType: 'profiles',
        entityId: canonicalId,
        operation: 'update',
        payload: merged,
      });
    }
  }

  async pullSettingsFromRemote(): Promise<void> {
    const { data, error } = await supabase.from('settings').select('*');
    if (error || !data) {
      return;
    }

    const db = getDatabase();
    for (const row of data) {
      const timestamp = nowIso();
      await db
        .insert(settings)
        .values({
          id: row.id,
          userId: row.user_id,
          theme: row.theme,
          notificationsEnabled: row.notifications_enabled,
          subscribedCategoryIds: JSON.stringify(row.subscribed_category_ids ?? []),
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: settings.id,
          set: {
            theme: row.theme,
            notificationsEnabled: row.notifications_enabled,
            subscribedCategoryIds: JSON.stringify(row.subscribed_category_ids ?? []),
            syncStatus: 'synced',
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }
}

export const profileRepository = new ProfileRepository();
