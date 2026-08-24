import { and, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { healthTimelineEvents } from '@/database/schema';
import type { MiniAppKey } from '@/mini-apps/_kit/snapshot-repository';
import { BaseRepository } from '@/repositories/base-repository';
import { supabase } from '@/lib/supabase';
import { toJson } from '@/sync/cloud-types';
import { nowIso, parseJson, stringifyJson } from '@/utils/helpers';
import {
  deleteHealthTimelineEventViaGateway,
  fetchHealthTimelineEventsViaGateway,
  isHealthDataGatewayConfigured,
  scrubEncryptedLeaves,
  scrubEncryptedText,
  upsertHealthTimelineEventViaGateway,
} from '@/domains/health-data-gateway';

import { projectMiniAppEvents } from '@/domains/timeline/projector';
import { isUnchangedTimelineEvent } from '@/domains/timeline/event-equality';
import type { HealthTimelineEvent } from '@/domains/timeline/types';

type EventRow = typeof healthTimelineEvents.$inferSelect;

type EventSyncPayload = HealthTimelineEvent & {
  syncStatus?: string;
  deletedAt?: string | null;
  createdAt?: string;
};

function mapEvent(row: EventRow): HealthTimelineEvent {
  return {
    id: row.id,
    userId: row.userId,
    appKey: row.appKey as MiniAppKey,
    kind: row.kind as HealthTimelineEvent['kind'],
    occurredOn: row.occurredOn,
    occurredAt: row.occurredAt,
    title: row.title,
    summary: row.summary,
    payload: parseJson<Record<string, unknown>>(row.payload, {}),
    updatedAt: row.updatedAt,
  };
}

function toSyncPayload(row: EventRow): EventSyncPayload {
  return {
    ...mapEvent(row),
    syncStatus: row.syncStatus,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
  };
}

function shouldQueueForUser(userId: string): boolean {
  return Boolean(userId && userId !== GUEST_USER_ID);
}

class HealthTimelineRepository extends BaseRepository {
  async listForUser(
    userId: string,
    options?: { fromDate?: string; toDate?: string; limit?: number },
  ): Promise<HealthTimelineEvent[]> {
    const db = getDatabase();
    const filters = [eq(healthTimelineEvents.userId, userId), isNull(healthTimelineEvents.deletedAt)];
    if (options?.fromDate) {
      filters.push(gte(healthTimelineEvents.occurredOn, options.fromDate));
    }
    if (options?.toDate) {
      filters.push(lte(healthTimelineEvents.occurredOn, options.toDate));
    }

    const rows = await db
      .select()
      .from(healthTimelineEvents)
      .where(and(...filters))
      .orderBy(desc(healthTimelineEvents.occurredOn), desc(healthTimelineEvents.occurredAt))
      .limit(options?.limit ?? 500);

    return rows.map(mapEvent);
  }

  /**
   * Replace all local events for one mini-app from its snapshot payload.
   * Deletes rows whose ids disappeared (dose removed, etc.) and queues sync.
   */
  async replaceFromSnapshot(params: {
    userId: string;
    appKey: MiniAppKey;
    payload: Record<string, unknown>;
  }): Promise<void> {
    if (!shouldQueueForUser(params.userId)) {
      return;
    }

    const projected = projectMiniAppEvents(params.userId, params.appKey, params.payload);
    const db = getDatabase();
    const timestamp = nowIso();
    const queueable = shouldQueueForUser(params.userId);

    const existing = await db
      .select()
      .from(healthTimelineEvents)
      .where(
        and(
          eq(healthTimelineEvents.userId, params.userId),
          eq(healthTimelineEvents.appKey, params.appKey),
          isNull(healthTimelineEvents.deletedAt),
        ),
      );

    const nextIds = new Set(projected.map((event) => event.id));
    const existingById = new Map(existing.map((row) => [row.id, row]));

    for (const event of projected) {
      const payloadJson = stringifyJson(event.payload);
      const previous = existingById.get(event.id);
      if (previous && isUnchangedTimelineEvent(previous, event, payloadJson)) {
        continue;
      }
      const values = {
        userId: event.userId,
        appKey: event.appKey,
        kind: event.kind,
        occurredOn: event.occurredOn,
        occurredAt: event.occurredAt,
        title: event.title,
        summary: event.summary,
        payload: payloadJson,
        syncStatus: queueable ? ('pending' as const) : ('synced' as const),
        deletedAt: null,
        updatedAt: timestamp,
      };

      if (previous) {
        await db.update(healthTimelineEvents).set(values).where(eq(healthTimelineEvents.id, event.id));
      } else {
        await db.insert(healthTimelineEvents).values({
          id: event.id,
          ...values,
          createdAt: timestamp,
        });
      }

      if (queueable) {
        const [row] = await db
          .select()
          .from(healthTimelineEvents)
          .where(eq(healthTimelineEvents.id, event.id))
          .limit(1);
        if (row) {
          await this.queueSync({
            entityType: 'health_timeline_events',
            entityId: event.id,
            operation: previous ? 'update' : 'create',
            payload: toSyncPayload(row),
          });
        }
      }
    }

    const staleIds = existing.map((row) => row.id).filter((id) => !nextIds.has(id));
    if (staleIds.length === 0) {
      return;
    }

    await db
      .update(healthTimelineEvents)
      .set({
        deletedAt: timestamp,
        syncStatus: queueable ? 'pending' : 'synced',
        updatedAt: timestamp,
      })
      .where(inArray(healthTimelineEvents.id, staleIds));

    if (!queueable) {
      return;
    }

    for (const id of staleIds) {
      await this.queueSync({
        entityType: 'health_timeline_events',
        entityId: id,
        operation: 'delete',
        payload: { id },
      });
    }
  }

  async syncToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      const viaGateway = await deleteHealthTimelineEventViaGateway(entityId);
      if (!viaGateway) {
        const { error } = await supabase.from('health_timeline_events').delete().eq('id', entityId);
        if (error) {
          throw new Error(error.message);
        }
      }
      const db = getDatabase();
      await db.delete(healthTimelineEvents).where(eq(healthTimelineEvents.id, entityId));
      return;
    }

    const item = payload as EventSyncPayload;
    if (!item?.userId || item.userId === GUEST_USER_ID) {
      return;
    }

    const gatewayRow = await upsertHealthTimelineEventViaGateway({
      id: item.id,
      userId: item.userId,
      appKey: item.appKey,
      kind: item.kind,
      occurredOn: item.occurredOn,
      occurredAt: item.occurredAt,
      title: item.title,
      summary: item.summary,
      payload: item.payload ?? {},
      updatedAt: item.updatedAt,
    });
    if (gatewayRow) {
      await this.markLocalSynced(entityId);
      return;
    }

    const row = {
      id: item.id,
      user_id: item.userId,
      app_key: item.appKey,
      kind: item.kind,
      occurred_on: item.occurredOn,
      occurred_at: item.occurredAt,
      title: item.title,
      summary: item.summary,
      payload: toJson(item.payload ?? {}),
      updated_at: item.updatedAt,
    };

    const { error } = await supabase.from('health_timeline_events').upsert(row, { onConflict: 'id' });
    if (error) {
      throw new Error(error.message);
    }
    await this.markLocalSynced(entityId);
  }

  async pullFromRemote(): Promise<void> {
    const gatewayRows = await fetchHealthTimelineEventsViaGateway();
    let rows: {
      id: string;
      user_id: string;
      app_key: string;
      kind: string;
      occurred_on: string;
      occurred_at: string | null;
      title: string;
      summary: string;
      payload: unknown;
      created_at?: string | null;
      updated_at?: string | null;
    }[] | null = null;

    if (gatewayRows) {
      rows = gatewayRows.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        app_key: String(row.app_key),
        kind: String(row.kind),
        occurred_on: String(row.occurred_on),
        occurred_at: row.occurred_at ? String(row.occurred_at) : null,
        title: String(row.title ?? ''),
        summary: String(row.summary ?? ''),
        payload: asPayload(row.payload),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } else if (isHealthDataGatewayConfigured()) {
      return;
    } else {
      const { data, error } = await supabase.from('health_timeline_events').select('*');
      if (error || !data) {
        return;
      }
      rows = data.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        app_key: String(row.app_key),
        kind: String(row.kind),
        occurred_on: String(row.occurred_on),
        occurred_at: row.occurred_at ? String(row.occurred_at) : null,
        title: scrubEncryptedText(row.title) ?? '',
        summary: scrubEncryptedText(row.summary) ?? '',
        payload: asPayload(scrubEncryptedLeaves(row.payload)),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    }

    if (!rows) {
      return;
    }

    const db = getDatabase();
    for (const remote of rows) {
      const id = String(remote.id);
      const timestamp = nowIso();
      const [existing] = await db
        .select()
        .from(healthTimelineEvents)
        .where(eq(healthTimelineEvents.id, id))
        .limit(1);

      const values = {
        id,
        userId: String(remote.user_id),
        appKey: String(remote.app_key),
        kind: String(remote.kind),
        occurredOn: String(remote.occurred_on),
        occurredAt: remote.occurred_at ? String(remote.occurred_at) : null,
        title: String(remote.title ?? ''),
        summary: String(remote.summary ?? ''),
        payload: stringifyJson(asPayload(remote.payload)),
        syncStatus: 'synced' as const,
        deletedAt: null,
        updatedAt: String(remote.updated_at ?? timestamp),
      };

      if (existing) {
        if (existing.syncStatus === 'pending' && existing.updatedAt > values.updatedAt) {
          continue;
        }
        await db.update(healthTimelineEvents).set(values).where(eq(healthTimelineEvents.id, id));
      } else {
        await db.insert(healthTimelineEvents).values({
          ...values,
          createdAt: String(remote.created_at ?? remote.updated_at ?? timestamp),
        });
      }
    }
  }

  private async markLocalSynced(id: string): Promise<void> {
    const db = getDatabase();
    await db
      .update(healthTimelineEvents)
      .set({ syncStatus: 'synced', updatedAt: nowIso() })
      .where(eq(healthTimelineEvents.id, id));
  }
}

function asPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export const healthTimelineRepository = new HealthTimelineRepository();
