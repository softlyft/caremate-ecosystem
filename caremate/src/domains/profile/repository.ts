import { and, eq, isNull } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { profiles, settings } from '@/database/schema';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
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
    state: row.state ?? null,
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
    const [row] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
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
          state: updated.state,
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
      state: input.state ?? null,
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
      state: profile.state,
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
      state: profile.state,
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
          state: row.state ?? null,
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
            state: row.state ?? null,
            syncStatus: 'synced',
            updatedAt: row.updated_at ?? timestamp,
          },
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
