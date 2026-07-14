import { eq } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { syncQueue } from '@/database/schema';
import type { SyncOperation } from '@/types';
import { createId, nowIso } from '@/utils/helpers';

export async function enqueueSyncOperation(params: {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
}): Promise<void> {
  const db = getDatabase();
  const timestamp = nowIso();
  const id = await createId();

  await db.insert(syncQueue).values({
    id,
    entityType: params.entityType,
    entityId: params.entityId,
    operation: params.operation,
    payload: JSON.stringify(params.payload),
    attempts: 0,
    lastError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // If online, push soon without blocking the write path.
  // Dynamic import avoids a circular dependency with sync/engine → repositories → queue.
  void import('@/sync/engine')
    .then(({ syncEngine }) => {
      syncEngine.requestSync({ reason: 'write' });
    })
    .catch(() => {
      // Sync engine may not be started yet during early bootstrap.
    });
}

export async function getPendingSyncOperations() {
  const db = getDatabase();
  return db.select().from(syncQueue).orderBy(syncQueue.createdAt);
}

export async function markSyncOperationComplete(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(syncQueue).where(eq(syncQueue.id, id));
}

export async function markSyncOperationFailed(id: string, error: string): Promise<void> {
  const db = getDatabase();
  const [item] = await db.select().from(syncQueue).where(eq(syncQueue.id, id)).limit(1);
  if (!item) {
    return;
  }

  await db
    .update(syncQueue)
    .set({
      attempts: item.attempts + 1,
      lastError: error,
      updatedAt: nowIso(),
    })
    .where(eq(syncQueue.id, id));
}
