import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { notifications } from '@/database/schema';
import type {
  CreateInAppNotificationInput,
  InAppNotification,
} from '@/domains/notifications/types';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { createId, nowIso, parseJson, stringifyJson } from '@/utils/helpers';

type NotificationRow = typeof notifications.$inferSelect;

type NotificationSyncPayload = InAppNotification & {
  syncStatus?: string;
  deletedAt?: string | null;
};

function mapNotification(row: NotificationRow): InAppNotification {
  return {
    id: row.id,
    userId: row.userId,
    domain: row.domain,
    eventType: row.eventType,
    title: row.title,
    body: row.body,
    severity: row.severity,
    entityType: row.entityType,
    entityId: row.entityId,
    data: parseJson<Record<string, unknown>>(row.dataJson, {}),
    dedupeKey: row.dedupeKey,
    readAt: row.readAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSyncPayload(row: NotificationRow): NotificationSyncPayload {
  return {
    ...mapNotification(row),
    syncStatus: row.syncStatus,
    deletedAt: row.deletedAt,
  };
}

function shouldQueueForUser(userId: string): boolean {
  return Boolean(userId && userId !== GUEST_USER_ID);
}

class NotificationRepository extends BaseRepository {
  async listForUser(userId: string, limit = 100): Promise<InAppNotification[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return rows.map(mapNotification);
  }

  async countUnread(userId: string): Promise<number> {
    const db = getDatabase();
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
          isNull(notifications.readAt),
        ),
      );
    return Number(row?.count ?? 0);
  }

  async create(input: CreateInAppNotificationInput): Promise<InAppNotification> {
    const db = getDatabase();
    const timestamp = nowIso();
    const dedupeKey = input.dedupeKey?.trim() || null;
    const queueable = shouldQueueForUser(input.userId);

    if (dedupeKey) {
      const [existing] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, input.userId),
            eq(notifications.dedupeKey, dedupeKey),
            isNull(notifications.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(notifications)
          .set({
            title: input.title,
            body: input.body,
            severity: input.severity ?? existing.severity,
            entityType: input.entityType ?? existing.entityType,
            entityId: input.entityId ?? existing.entityId,
            dataJson: stringifyJson(input.data ?? parseJson(existing.dataJson, {})),
            // Keep read state — repeated sync must not re-badge the bell.
            updatedAt: timestamp,
            syncStatus: queueable ? 'pending' : 'synced',
          })
          .where(eq(notifications.id, existing.id));

        const [updated] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, existing.id))
          .limit(1);
        const mapped = mapNotification(updated!);
        if (queueable && updated) {
          await this.queueSync({
            entityType: 'notifications',
            entityId: updated.id,
            operation: 'update',
            payload: toSyncPayload(updated),
          });
        }
        return mapped;
      }
    }

    const id = await createId();
    await db.insert(notifications).values({
      id,
      userId: input.userId,
      domain: input.domain,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      severity: input.severity ?? 'info',
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      dataJson: stringifyJson(input.data ?? {}),
      dedupeKey,
      readAt: null,
      syncStatus: queueable ? 'pending' : 'synced',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const [created] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    if (queueable && created) {
      await this.queueSync({
        entityType: 'notifications',
        entityId: created.id,
        operation: 'create',
        payload: toSyncPayload(created),
      });
    }
    return mapNotification(created!);
  }

  async markAllRead(userId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const queueable = shouldQueueForUser(userId);

    const unread = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
          isNull(notifications.readAt),
        ),
      );

    if (unread.length === 0) {
      return;
    }

    await db
      .update(notifications)
      .set({
        readAt: timestamp,
        updatedAt: timestamp,
        syncStatus: queueable ? 'pending' : 'synced',
      })
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
          isNull(notifications.readAt),
        ),
      );

    if (!queueable) {
      return;
    }

    for (const row of unread) {
      await this.queueSync({
        entityType: 'notifications',
        entityId: row.id,
        operation: 'update',
        payload: {
          ...toSyncPayload(row),
          readAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending',
        },
      });
    }
  }

  async markRead(id: string, userId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const queueable = shouldQueueForUser(userId);

    await db
      .update(notifications)
      .set({
        readAt: timestamp,
        updatedAt: timestamp,
        syncStatus: queueable ? 'pending' : 'synced',
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
        ),
      );

    if (!queueable) {
      return;
    }

    const [row] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    if (row) {
      await this.queueSync({
        entityType: 'notifications',
        entityId: row.id,
        operation: 'update',
        payload: toSyncPayload(row),
      });
    }
  }

  /** Reassign guest inbox rows onto a signed-in account and queue cloud upsert. */
  async migrateGuestToUser(toUserId: string, fromUserId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const queueable = shouldQueueForUser(toUserId);

    await db
      .update(notifications)
      .set({
        userId: toUserId,
        updatedAt: timestamp,
        syncStatus: queueable ? 'pending' : 'synced',
      })
      .where(and(eq(notifications.userId, fromUserId), isNull(notifications.deletedAt)));

    if (!queueable) {
      return;
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, toUserId), isNull(notifications.deletedAt)));

    for (const row of rows) {
      await this.queueSync({
        entityType: 'notifications',
        entityId: row.id,
        operation: 'update',
        payload: toSyncPayload(row),
      });
    }
  }

  async syncToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      const { error } = await supabase.from('notifications').delete().eq('id', entityId);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const item = payload as NotificationSyncPayload;
    if (!item?.userId || item.userId === GUEST_USER_ID) {
      return;
    }

    const row = {
      id: item.id,
      user_id: item.userId,
      domain: item.domain,
      event_type: item.eventType,
      title: item.title,
      body: item.body,
      severity: item.severity || 'info',
      entity_type: item.entityType,
      entity_id: item.entityId,
      data: item.data ?? {},
      dedupe_key: item.dedupeKey,
      read_at: item.readAt,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };

    const { error } = await supabase.from('notifications').upsert(row, { onConflict: 'id' });
    if (!error) {
      await this.markLocalSynced(entityId);
      return;
    }

    // Same dedupe_key may already exist under a different UUID (edge push/email path).
    if (item.dedupeKey) {
      const { data: existing, error: lookupError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', item.userId)
        .eq('dedupe_key', item.dedupeKey)
        .maybeSingle();

      if (lookupError) {
        throw new Error(lookupError.message);
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            domain: row.domain,
            event_type: row.event_type,
            title: row.title,
            body: row.body,
            severity: row.severity,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            data: row.data,
            read_at: row.read_at,
            updated_at: row.updated_at,
          })
          .eq('id', existing.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        if (existing.id !== entityId) {
          await this.remapLocalId(entityId, existing.id);
        } else {
          await this.markLocalSynced(entityId);
        }
        return;
      }
    }

    throw new Error(error.message);
  }

  async pullFromRemote(userId: string): Promise<void> {
    if (!userId || userId === GUEST_USER_ID) {
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      return;
    }

    const db = getDatabase();

    for (const remote of data) {
      const remoteId = String(remote.id);
      const dedupeKey =
        typeof remote.dedupe_key === 'string' && remote.dedupe_key.trim()
          ? remote.dedupe_key.trim()
          : null;
      const remoteUpdatedAt = remote.updated_at ?? remote.created_at ?? nowIso();

      let local: NotificationRow | undefined;

      const [byId] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, remoteId))
        .limit(1);
      local = byId;

      if (!local && dedupeKey) {
        const [byDedupe] = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.dedupeKey, dedupeKey),
              isNull(notifications.deletedAt),
            ),
          )
          .limit(1);
        local = byDedupe;
      }

      if (local?.syncStatus === 'pending') {
        const localUpdated = Date.parse(local.updatedAt);
        const remoteUpdated = Date.parse(String(remoteUpdatedAt));
        if (
          Number.isFinite(localUpdated) &&
          Number.isFinite(remoteUpdated) &&
          localUpdated > remoteUpdated
        ) {
          continue;
        }
      }

      if (local && local.id !== remoteId) {
        await db.delete(notifications).where(eq(notifications.id, local.id));
      }

      const values = {
        id: remoteId,
        userId,
        domain: String(remote.domain),
        eventType: String(remote.event_type),
        title: String(remote.title),
        body: String(remote.body),
        severity: String(remote.severity ?? 'info'),
        entityType: remote.entity_type ? String(remote.entity_type) : null,
        entityId: remote.entity_id ? String(remote.entity_id) : null,
        dataJson: stringifyJson(remote.data ?? {}),
        dedupeKey,
        readAt: remote.read_at ? String(remote.read_at) : null,
        syncStatus: 'synced' as const,
        deletedAt: null,
        createdAt: String(remote.created_at ?? nowIso()),
        updatedAt: String(remoteUpdatedAt),
      };

      await db
        .insert(notifications)
        .values(values)
        .onConflictDoUpdate({
          target: notifications.id,
          set: {
            domain: values.domain,
            eventType: values.eventType,
            title: values.title,
            body: values.body,
            severity: values.severity,
            entityType: values.entityType,
            entityId: values.entityId,
            dataJson: values.dataJson,
            dedupeKey: values.dedupeKey,
            readAt: values.readAt,
            syncStatus: 'synced',
            deletedAt: null,
            updatedAt: values.updatedAt,
          },
        });
    }
  }

  private async markLocalSynced(id: string): Promise<void> {
    const db = getDatabase();
    await db.update(notifications).set({ syncStatus: 'synced' }).where(eq(notifications.id, id));
  }

  private async remapLocalId(fromId: string, toId: string): Promise<void> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, fromId))
      .limit(1);
    if (!row) {
      return;
    }

    await db.delete(notifications).where(eq(notifications.id, fromId));
    await db
      .insert(notifications)
      .values({
        ...row,
        id: toId,
        syncStatus: 'synced',
        updatedAt: nowIso(),
      })
      .onConflictDoUpdate({
        target: notifications.id,
        set: {
          title: row.title,
          body: row.body,
          severity: row.severity,
          entityType: row.entityType,
          entityId: row.entityId,
          dataJson: row.dataJson,
          dedupeKey: row.dedupeKey,
          readAt: row.readAt,
          syncStatus: 'synced',
          deletedAt: null,
          updatedAt: nowIso(),
        },
      });
  }
}

export const notificationRepository = new NotificationRepository();
