import { eq } from 'drizzle-orm';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { config } from '@/constants/env';
import { SYNC_CONFIG } from '@/constants/config';
import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { syncMetadata } from '@/database/schema';
import { useAuthStore } from '@/features/auth/store';
import {
  migrateMiniAppsToSnapshots,
  rehydrateMiniAppsFromSnapshots,
} from '@/mini-apps/_kit/hydrate';
import '@/mini-apps/_kit/bootstrap';
import {
  getPendingSyncOperations,
  markSyncOperationComplete,
  markSyncOperationFailed,
} from '@/sync/queue';
import { isOnline, watchNetworkStatus } from '@/sync/network';
import { registerDefaultSyncHandlers } from '@/sync/register-default-handlers';
import { getRegisteredSyncHandlers, getSyncHandler } from '@/sync/registry';
import { nowIso } from '@/utils/helpers';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function msUntilNextLocalMidnight(from = new Date()): number {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return Math.max(1_000, next.getTime() - from.getTime());
}

class SyncEngine {
  private running = false;
  private cycleInFlight: Promise<void> | null = null;
  private requestTimer: ReturnType<typeof setTimeout> | null = null;
  private dailyTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeNetwork: (() => void) | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  private wasOnline: boolean | null = null;

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    registerDefaultSyncHandlers();

    this.unsubscribeNetwork = await watchNetworkStatus((online) => {
      if (!this.running) {
        return;
      }
      const becameOnline = online && this.wasOnline === false;
      this.wasOnline = online;
      if (becameOnline) {
        this.requestSync({ reason: 'reconnect', immediate: true });
      }
    });

    this.appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        this.requestSync({ reason: 'foreground', immediate: true });
      }
    });

    this.scheduleDailySafetySync();
    this.intervalTimer = setInterval(() => {
      this.requestSync({ reason: 'interval' });
    }, SYNC_CONFIG.pullIntervalMs);

    const userId = useAuthStore.getState().user?.id;
    if (userId && userId !== GUEST_USER_ID && !useAuthStore.getState().isGuest) {
      // Guest→account migration runs only from prepareLocalAccount (explicit sign-in/up).
      await migrateMiniAppsToSnapshots(userId);
    }

    await this.runSyncCycle({ reason: 'startup' });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = null;
    }
    if (this.dailyTimer) {
      clearTimeout(this.dailyTimer);
      this.dailyTimer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = null;
    this.appStateSub?.remove();
    this.appStateSub = null;
  }

  /**
   * Ask for a sync cycle. Debounced by default so bursts of writes coalesce.
   * Use `immediate` for reconnect / foreground / daily safety.
   */
  requestSync(options: { reason?: string; immediate?: boolean } = {}): void {
    if (!this.running) {
      return;
    }

    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = null;
    }

    const delay = options.immediate ? 0 : SYNC_CONFIG.writeDebounceMs;
    this.requestTimer = setTimeout(() => {
      this.requestTimer = null;
      void this.runSyncCycle({ reason: options.reason ?? 'request' });
    }, delay);
  }

  /** Runs even when the engine is not "started" (e.g. headless background task). */
  async runSyncCycle(_options: { reason?: string } = {}): Promise<void> {
    registerDefaultSyncHandlers();

    if (this.cycleInFlight) {
      return this.cycleInFlight;
    }

    this.cycleInFlight = this.executeSyncCycle().finally(() => {
      this.cycleInFlight = null;
    });

    return this.cycleInFlight;
  }

  private async executeSyncCycle(): Promise<void> {
    const online = await isOnline();
    this.wasOnline = online;

    // Medication Assistant in-app due/missed/refill cards (never blocks sync).
    try {
      const auth = useAuthStore.getState();
      const userId = auth.user?.id;
      if (userId && userId !== GUEST_USER_ID && !auth.isGuest) {
        const [{ useMedicationTrackerStore }, { useSettingsStore }, { evaluateMedicationAlerts }] =
          await Promise.all([
            import('@/mini-apps/medication-tracker/store'),
            import('@/domains/profile/store'),
            import('@/mini-apps/medication-tracker/alerts'),
          ]);
        const medState = useMedicationTrackerStore.getState();
        await evaluateMedicationAlerts({
          userId,
          medications: medState.medications,
          logs: medState.logs,
          notificationsEnabled: useSettingsStore.getState().notificationsEnabled,
        });
      }
    } catch {
      // Best-effort inbox updates.
    }

    // Analytics outbox is independent of Supabase — flush whenever we regain network.
    if (online) {
      try {
        const { flushAnalyticsQueue } = await import('@/lib/monitoring/analytics-queue');
        await flushAnalyticsQueue();
      } catch {
        // Analytics must not block health-data sync.
      }
    }

    if (!online || !config.isSupabaseConfigured) {
      return;
    }

    const auth = useAuthStore.getState();
    const userId = auth.user?.id;
    if (userId && userId !== GUEST_USER_ID && !auth.isGuest) {
      // Guest→account migration is not repeated here — only on explicit sign-in/up.
      await migrateMiniAppsToSnapshots(userId);
    }

    await this.pushPendingChanges();
    await this.pullRemoteChanges();

    if (userId && userId !== GUEST_USER_ID && !auth.isGuest) {
      const pending = await getPendingSyncOperations();
      const hasPendingMiniApps = pending.some((item) => item.entityType === 'mini_app_snapshots');
      if (!hasPendingMiniApps) {
        await rehydrateMiniAppsFromSnapshots(userId);
      }
    }

    const syncedAt = nowIso();
    await this.setMetadata('last_sync_at', syncedAt);
    await this.setMetadata('last_sync_local_date', localDateKey());
  }

  private scheduleDailySafetySync(): void {
    if (this.dailyTimer) {
      clearTimeout(this.dailyTimer);
    }

    this.dailyTimer = setTimeout(() => {
      this.dailyTimer = null;
      this.requestSync({ reason: 'daily-midnight', immediate: true });
      this.scheduleDailySafetySync();
    }, msUntilNextLocalMidnight());
  }

  private async pushPendingChanges(): Promise<void> {
    const auth = useAuthStore.getState();
    if (auth.isGuest || !auth.user?.id || auth.user.id === GUEST_USER_ID) {
      return;
    }

    const pending = await getPendingSyncOperations();

    for (const item of pending) {
      if (item.attempts >= SYNC_CONFIG.maxRetries) {
        continue;
      }

      const handler = getSyncHandler(item.entityType);
      if (!handler) {
        await markSyncOperationComplete(item.id);
        continue;
      }

      try {
        const payload = JSON.parse(item.payload) as unknown;
        await handler.push(item.entityId, item.operation, payload);
        await markSyncOperationComplete(item.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown sync error';
        await markSyncOperationFailed(item.id, message);
      }
    }
  }

  private async pullRemoteChanges(): Promise<void> {
    for (const handler of getRegisteredSyncHandlers()) {
      try {
        await handler.pull();
      } catch {
        // Pull failures should not block other entities.
      }
    }
  }

  private async setMetadata(key: string, value: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const existing = await db.select().from(syncMetadata).where(eq(syncMetadata.key, key)).limit(1);

    if (existing.length > 0) {
      await db
        .update(syncMetadata)
        .set({ value, updatedAt: timestamp })
        .where(eq(syncMetadata.key, key));
      return;
    }

    await db.insert(syncMetadata).values({ key, value, updatedAt: timestamp });
  }
}

export const syncEngine = new SyncEngine();
