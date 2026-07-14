import type { SyncOperation } from '@/types';

export type SyncHandler = {
  push: (entityId: string, operation: SyncOperation | string, payload: unknown) => Promise<void>;
  pull: () => Promise<void>;
};

const handlers = new Map<string, SyncHandler>();

export function registerSyncHandler(entityType: string, handler: SyncHandler): void {
  handlers.set(entityType, handler);
}

export function getSyncHandler(entityType: string): SyncHandler | undefined {
  return handlers.get(entityType);
}

export function getRegisteredSyncHandlers(): SyncHandler[] {
  return Array.from(handlers.values());
}

export function clearSyncHandlersForTests(): void {
  handlers.clear();
}
