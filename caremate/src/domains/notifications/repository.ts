import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { notifications } from '@/database/schema';
import type {
  CreateInAppNotificationInput,
  InAppNotification,
} from '@/domains/notifications/types';
import { createId, nowIso, parseJson, stringifyJson } from '@/utils/helpers';

function mapNotification(row: typeof notifications.$inferSelect): InAppNotification {
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

class NotificationRepository {
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
            syncStatus: 'synced',
          })
          .where(eq(notifications.id, existing.id));

        const [updated] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, existing.id))
          .limit(1);
        return mapNotification(updated!);
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
      syncStatus: 'synced',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const [created] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return mapNotification(created!);
  }

  async markAllRead(userId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({ readAt: timestamp, updatedAt: timestamp, syncStatus: 'synced' })
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
          isNull(notifications.readAt),
        ),
      );
  }

  async markRead(id: string, userId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({ readAt: timestamp, updatedAt: timestamp, syncStatus: 'synced' })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
        ),
      );
  }

  /** Reassign guest inbox rows onto a signed-in account. */
  async migrateGuestToUser(toUserId: string, fromUserId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({ userId: toUserId, updatedAt: timestamp, syncStatus: 'synced' })
      .where(and(eq(notifications.userId, fromUserId), isNull(notifications.deletedAt)));
  }
}

export const notificationRepository = new NotificationRepository();
