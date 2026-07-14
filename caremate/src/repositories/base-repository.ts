import type { SyncOperation } from '@/types';
import { enqueueSyncOperation } from '@/sync/queue';

export abstract class BaseRepository {
  protected async queueSync(params: {
    entityType: string;
    entityId: string;
    operation: SyncOperation;
    payload: unknown;
  }): Promise<void> {
    await enqueueSyncOperation(params);
  }
}
