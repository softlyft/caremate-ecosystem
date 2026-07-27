import { and, eq, isNull } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { miniAppSnapshots } from '@/database/schema';
import {
  fetchMiniAppSnapshotsViaGateway,
  isHealthDataGatewayConfigured,
  scrubEncryptedLeaves,
  upsertMiniAppSnapshotViaGateway,
} from '@/domains/health-data-gateway';
import { BaseRepository } from '@/repositories/base-repository';
import { supabase } from '@/lib/supabase';
import { toJson } from '@/sync/cloud-types';
import { nowIso, parseJson, stringifyJson } from '@/utils/helpers';

export const MINI_APP_KEYS = [
  'vitals',
  'medication',
  'checkup',
  'immunization',
  'pregnancy',
  'period',
] as const;

export type MiniAppKey = (typeof MINI_APP_KEYS)[number];

export const MINI_APP_STORAGE_KEYS: Record<MiniAppKey, string> = {
  vitals: 'caremate-vitals-tracker',
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

function asPayloadRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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
      const { error } = await supabase.from('mini_app_snapshots').delete().eq('id', entityId);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const snapshot = payload as {
      id: string;
      userId: string;
      appKey: MiniAppKey;
      payload: Record<string, unknown>;
      updatedAt: string;
    };

    const gatewayRow = await upsertMiniAppSnapshotViaGateway(snapshot);
    if (gatewayRow) {
      await this.markLocalSynced(snapshot.id);
      return;
    }

    const { error } = await supabase.from('mini_app_snapshots').upsert({
      id: snapshot.id,
      user_id: snapshot.userId,
      app_key: snapshot.appKey,
      payload: toJson(snapshot.payload),
      updated_at: snapshot.updatedAt,
    });
    if (error) {
      throw new Error(error.message);
    }
    await this.markLocalSynced(snapshot.id);
  }

  async pullFromRemote(): Promise<void> {
    const gatewayRows = await fetchMiniAppSnapshotsViaGateway();
    let rows: {
      id: string;
      user_id: string;
      app_key: string;
      payload: unknown;
      updated_at?: string | null;
    }[] | null = null;

    if (gatewayRows) {
      rows = gatewayRows;
    } else if (isHealthDataGatewayConfigured()) {
      // Gateway is source of truth when configured.
      return;
    } else {
      const { data, error } = await supabase.from('mini_app_snapshots').select('*');
      if (error || !data) {
        return;
      }
      rows = data.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        app_key: String(row.app_key),
        payload: scrubEncryptedLeaves(row.payload ?? {}),
        updated_at: row.updated_at,
      }));
    }

    const db = getDatabase();
    for (const row of rows) {
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

      const payload = asPayloadRecord(row.payload);
      const values = {
        id,
        userId: String(row.user_id),
        appKey: String(row.app_key),
        payload: stringifyJson(payload),
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

  private async markLocalSynced(id: string): Promise<void> {
    const db = getDatabase();
    await db
      .update(miniAppSnapshots)
      .set({ syncStatus: 'synced', updatedAt: nowIso() })
      .where(eq(miniAppSnapshots.id, id));
  }
}

export const miniAppSnapshotRepository = new MiniAppSnapshotRepository();
