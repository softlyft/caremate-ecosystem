import { and, eq, isNull } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { miniAppSnapshots } from '@/database/schema';
import { BaseRepository } from '@/repositories/base-repository';
import { supabase } from '@/lib/supabase';
import { toJson } from '@/sync/cloud-types';
import { nowIso, parseJson, stringifyJson } from '@/utils/helpers';

export const MINI_APP_KEYS = [
  'medication',
  'checkup',
  'immunization',
  'pregnancy',
  'period',
] as const;

export type MiniAppKey = (typeof MINI_APP_KEYS)[number];

export const MINI_APP_STORAGE_KEYS: Record<MiniAppKey, string> = {
  medication: 'caremate-medication-tracker',
  checkup: 'caremate-checkup-planner',
  immunization: 'caremate-immunization-tracker',
  pregnancy: 'caremate-pregnancy-tracker',
  period: 'caremate-period-tracker',
};

export function isMiniAppKey(value: string): value is MiniAppKey {
  return (MINI_APP_KEYS as readonly string[]).includes(value);
}

export function miniAppSnapshotId(userId: string, appKey: MiniAppKey): string {
  return `${userId}:${appKey}`;
}

export type MiniAppSnapshotRecord = {
  id: string;
  userId: string;
  appKey: MiniAppKey;
  payload: Record<string, unknown>;
  updatedAt: string;
};

function canSyncForUser(userId: string | null | undefined): userId is string {
  return Boolean(userId && userId !== GUEST_USER_ID);
}

class MiniAppSnapshotRepository extends BaseRepository {
  async findByUserAndApp(
    userId: string,
    appKey: MiniAppKey,
  ): Promise<MiniAppSnapshotRecord | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(miniAppSnapshots)
      .where(
        and(
          eq(miniAppSnapshots.userId, userId),
          eq(miniAppSnapshots.appKey, appKey),
          isNull(miniAppSnapshots.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userId: row.userId,
      appKey: row.appKey as MiniAppKey,
      payload: parseJson<Record<string, unknown>>(row.payload, {}),
      updatedAt: row.updatedAt,
    };
  }

  async findByUserId(userId: string): Promise<MiniAppSnapshotRecord[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(miniAppSnapshots)
      .where(and(eq(miniAppSnapshots.userId, userId), isNull(miniAppSnapshots.deletedAt)));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      appKey: row.appKey as MiniAppKey,
      payload: parseJson<Record<string, unknown>>(row.payload, {}),
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Persist a mini-app Zustand state blob locally and enqueue cloud sync for signed-in users.
   */
  async save(params: {
    userId: string;
    appKey: MiniAppKey;
    payload: Record<string, unknown>;
  }): Promise<void> {
    if (!canSyncForUser(params.userId)) {
      return;
    }

    const db = getDatabase();
    const timestamp = nowIso();
    const id = miniAppSnapshotId(params.userId, params.appKey);
    const existing = await this.findByUserAndApp(params.userId, params.appKey);
    const payloadJson = stringifyJson(params.payload);

    if (existing) {
      await db
        .update(miniAppSnapshots)
        .set({
          payload: payloadJson,
          syncStatus: 'pending',
          updatedAt: timestamp,
          deletedAt: null,
        })
        .where(eq(miniAppSnapshots.id, id));
    } else {
      await db.insert(miniAppSnapshots).values({
        id,
        userId: params.userId,
        appKey: params.appKey,
        payload: payloadJson,
        syncStatus: 'pending',
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await this.queueSync({
      entityType: 'mini_app_snapshots',
      entityId: id,
      operation: existing ? 'update' : 'create',
      payload: {
        id,
        userId: params.userId,
        appKey: params.appKey,
        payload: params.payload,
        updatedAt: timestamp,
      },
    });
  }

  async syncToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      await supabase.from('mini_app_snapshots').delete().eq('id', entityId);
      return;
    }

    const snapshot = payload as {
      id: string;
      userId: string;
      appKey: MiniAppKey;
      payload: Record<string, unknown>;
      updatedAt: string;
    };

    await supabase.from('mini_app_snapshots').upsert({
      id: snapshot.id,
      user_id: snapshot.userId,
      app_key: snapshot.appKey,
      payload: toJson(snapshot.payload),
      updated_at: snapshot.updatedAt,
    });
  }

  async pullFromRemote(): Promise<void> {
    const { data, error } = await supabase.from('mini_app_snapshots').select('*');
    if (error || !data) {
      return;
    }

    const db = getDatabase();
    for (const row of data) {
      if (!isMiniAppKey(String(row.app_key))) {
        continue;
      }

      const timestamp = nowIso();
      const id = String(row.id);
      const existing = await db
        .select()
        .from(miniAppSnapshots)
        .where(eq(miniAppSnapshots.id, id))
        .limit(1);

      const values = {
        id,
        userId: String(row.user_id),
        appKey: String(row.app_key),
        payload: stringifyJson(row.payload ?? {}),
        syncStatus: 'synced' as const,
        deletedAt: null,
        updatedAt: String(row.updated_at ?? timestamp),
      };

      if (existing.length > 0) {
        // Prefer remote only when it is newer or local is already synced.
        const localUpdated = existing[0].updatedAt;
        const remoteUpdated = values.updatedAt;
        if (existing[0].syncStatus === 'pending' && localUpdated > remoteUpdated) {
          continue;
        }
        await db.update(miniAppSnapshots).set(values).where(eq(miniAppSnapshots.id, id));
      } else {
        await db.insert(miniAppSnapshots).values({
          ...values,
          createdAt: String(row.updated_at ?? timestamp),
        });
      }
    }
  }
}

export const miniAppSnapshotRepository = new MiniAppSnapshotRepository();
