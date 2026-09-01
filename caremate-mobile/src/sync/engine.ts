import { eq } from 'drizzle-orm';
import {
  AppState,
  InteractionManager,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';

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
  applyAppStateChange,
  createAppBackgroundGate,
  type AppBackgroundGate,
} from '@/sync/app-state';
import { planSyncCycle, preferRicherSyncReason } from '@/sync/cycle-policy';
import {
  getPendingSyncOperations,
  markSyncOperationComplete,
  markSyncOperationFailed,
} from '@/sync/queue';
import { isOnline, watchNetworkStatus } from '@/sync/network';
import { registerDefaultSyncHandlers } from '@/sync/register-default-handlers';
import { getRegisteredSyncHandlers, getSyncHandler } from '@/sync/registry';
import { nowIso } from '@/utils/helpers';

/** Yield to navigation / scroll; don't stall forever if InteractionManager never settles. */
const UI_IDLE_TIMEOUT_MS = 500;

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
  private queuedReason: string | null = null;
  private requestTimer: ReturnType<typeof setTimeout> | null = null;
  private dailyTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private idleSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  private interactionHandle: { cancel: () => void } | null = null;
  private unsubscribeNetwork: (() => void) | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  private wasOnline: boolean | null = null;
  private appBackgroundGate: AppBackgroundGate = createAppBackgroundGate();

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

    this.appBackgroundGate = createAppBackgroundGate(AppState.currentState);
    this.appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      const { shouldForegroundSync } = applyAppStateChange(this.appBackgroundGate, state);
      if (shouldForegroundSync) {
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
    this.cancelScheduledCycle();
    this.queuedReason = null;
  }

  /**
   * Ask for a sync cycle. Debounced by default so bursts of writes coalesce.
   * Use `immediate` for reconnect / foreground / daily safety.
   * Cycles wait until the UI is idle so navigation and scrolling stay smooth.
   */
  requestSync(options: { reason?: string; immediate?: boolean } = {}): void {
    if (!this.running) {
      return;
    }

    const reason = options.reason ?? 'request';
    if (this.cycleInFlight) {
      this.queuedReason = preferRicherSyncReason(this.queuedReason, reason);
      return;
    }

    this.cancelScheduledCycle();

    const delay = options.immediate ? 0 : SYNC_CONFIG.writeDebounceMs;
    this.requestTimer = setTimeout(() => {
      this.requestTimer = null;
      this.runAfterUiIdle(() => {
        void this.runSyncCycle({ reason });
      });
    }, delay);
  }

  private cancelScheduledCycle(): void {
    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = null;
    }
    this.interactionHandle?.cancel();
    this.interactionHandle = null;
    if (this.idleSafetyTimer) {
      clearTimeout(this.idleSafetyTimer);
      this.idleSafetyTimer = null;
    }
  }

  private runAfterUiIdle(fn: () => void): void {
    this.interactionHandle?.cancel();
    if (this.idleSafetyTimer) {
      clearTimeout(this.idleSafetyTimer);
      this.idleSafetyTimer = null;
    }

    let ran = false;
    const runOnce = () => {
      if (ran) {
        return;
      }
      ran = true;
      this.interactionHandle = null;
      if (this.idleSafetyTimer) {
        clearTimeout(this.idleSafetyTimer);
        this.idleSafetyTimer = null;
      }
      fn();
    };

    this.interactionHandle = InteractionManager.runAfterInteractions(runOnce);
    this.idleSafetyTimer = setTimeout(runOnce, UI_IDLE_TIMEOUT_MS);
  }

  /** Runs even when the engine is not "started" (e.g. headless background task). */
  async runSyncCycle(options: { reason?: string } = {}): Promise<void> {
    registerDefaultSyncHandlers();

    const reason = options.reason ?? 'request';
    if (this.cycleInFlight) {
      this.queuedReason = preferRicherSyncReason(this.queuedReason, reason);
      return this.cycleInFlight;
    }

    this.cycleInFlight = this.executeSyncCycle(reason)
      .catch(() => undefined)
      .finally(() => {
        this.cycleInFlight = null;
        const queued = this.queuedReason;
        this.queuedReason = null;
        if (queued && this.running) {
          const plan = planSyncCycle(queued);
          this.requestSync({ reason: queued, immediate: plan.pullRemote });
        }
      });

    return this.cycleInFlight;
  }

  private async executeSyncCycle(reason: string): Promise<void> {
    const plan = planSyncCycle(reason);
    const online = await isOnline();
    this.wasOnline = online;

    // Medication + Pregnancy in-app alert cards (never blocks sync).
    try {
      const auth = useAuthStore.getState();
      const userId = auth.user?.id;
      if (plan.evaluateAlerts && userId && userId !== GUEST_USER_ID && !auth.isGuest) {
        const [
          { useMedicationTrackerStore },
          { usePregnancyTrackerStore },
          { useSettingsStore },
          { evaluateMedicationAlerts },
          { syncMedicationScheduledNotifications },
          { evaluatePregnancyAlerts },
          { toDateKey },
        ] = await Promise.all([
          import('@/mini-apps/medication-tracker/store'),
          import('@/mini-apps/pregnancy-tracker/store'),
          import('@/domains/profile/store'),
          import('@/mini-apps/medication-tracker/alerts'),
          import('@/mini-apps/medication-tracker/scheduled-notifications'),
          import('@/mini-apps/pregnancy-tracker/alerts'),
          import('@/mini-apps/_kit/date-utils'),
        ]);
        const notificationsEnabled = useSettingsStore.getState().notificationsEnabled;
        const medState = useMedicationTrackerStore.getState();
        await syncMedicationScheduledNotifications({
          medications: medState.medications,
          logs: medState.logs,
          notificationsEnabled,
        });
        await evaluateMedicationAlerts({
          userId,
          medications: medState.medications,
          logs: medState.logs,
          notificationsEnabled,
        });
        const pregnancy = usePregnancyTrackerStore.getState();
        const todayKey = toDateKey(new Date());
        await evaluatePregnancyAlerts({
          userId,
          lastMenstrualPeriod: pregnancy.lastMenstrualPeriod,
          dueDate: pregnancy.dueDate,
          babyNickname: pregnancy.babyNickname,
          hasTodayLog: Boolean(pregnancy.dailyLogs[todayKey]),
          status: pregnancy.status,
          maternalTtDoses: pregnancy.maternalTtDoses,
          notificationsEnabled,
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
    if (plan.migrateMiniApps && userId && userId !== GUEST_USER_ID && !auth.isGuest) {
      // Guest→account migration is not repeated here — only on explicit sign-in/up.
      await migrateMiniAppsToSnapshots(userId);
    }

    if (plan.pushPending) {
      await this.pushPendingChanges();
    }
    if (plan.pullRemote) {
      await this.pullRemoteChanges();
    }

    if (plan.rehydrateMiniApps && userId && userId !== GUEST_USER_ID && !auth.isGuest) {
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

  async getLastSyncAt(): Promise<string | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.key, 'last_sync_at'))
      .limit(1);
    return row?.value ?? null;
  }
}

export const syncEngine = new SyncEngine();
