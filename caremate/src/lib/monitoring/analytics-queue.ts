import { eq } from 'drizzle-orm';

import { ANALYTICS_QUEUE_CONFIG } from '@/constants/config';
import { getDatabase, isDatabaseInitialized } from '@/database/client';
import { analyticsQueue } from '@/database/schema';
import { GUEST_USER_ID } from '@/constants/guest';
import { useAuthStore } from '@/features/auth/store';
import { isOnline } from '@/sync/network';
import { createId, nowIso } from '@/utils/helpers';

export type AnalyticsQueueKind = 'event' | 'screen';

type AnalyticsProps = Record<string, string | number | boolean | null>;

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight: Promise<void> | null = null;

type PostHogSender = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  screen: (name: string, properties?: Record<string, unknown>) => void | Promise<void>;
};

let sender: PostHogSender | null = null;

/** Bound from analytics.ts when the PostHog SDK client is ready. */
export function bindAnalyticsSender(instance: PostHogSender | null): void {
  sender = instance;
  if (instance) {
    requestAnalyticsFlush({ immediate: true });
  }
}

function resolveDistinctId(): string | null {
  try {
    const auth = useAuthStore.getState();
    if (!auth.isInitialized || auth.isGuest || !auth.user?.id) {
      return null;
    }
    if (auth.user.id === GUEST_USER_ID) {
      return null;
    }
    return auth.user.id;
  } catch {
    return null;
  }
}

export async function enqueueAnalyticsEvent(params: {
  kind: AnalyticsQueueKind;
  name: string;
  properties?: AnalyticsProps;
}): Promise<void> {
  if (!isDatabaseInitialized()) {
    return;
  }

  const db = getDatabase();
  const timestamp = nowIso();
  const id = await createId();

  await db.insert(analyticsQueue).values({
    id,
    kind: params.kind,
    name: params.name,
    properties: JSON.stringify(params.properties ?? {}),
    distinctId: resolveDistinctId(),
    occurredAt: timestamp,
    attempts: 0,
    lastError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  requestAnalyticsFlush();
}

export async function getPendingAnalyticsEvents() {
  if (!isDatabaseInitialized()) {
    return [];
  }
  const db = getDatabase();
  return db.select().from(analyticsQueue).orderBy(analyticsQueue.createdAt);
}

async function markAnalyticsEventComplete(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(analyticsQueue).where(eq(analyticsQueue.id, id));
}

async function markAnalyticsEventFailed(id: string, error: string): Promise<void> {
  const db = getDatabase();
  const [item] = await db.select().from(analyticsQueue).where(eq(analyticsQueue.id, id)).limit(1);
  if (!item) {
    return;
  }

  await db
    .update(analyticsQueue)
    .set({
      attempts: item.attempts + 1,
      lastError: error,
      updatedAt: nowIso(),
    })
    .where(eq(analyticsQueue.id, id));
}

/**
 * Ask for a flush. Debounced by default so bursts of track/screen coalesce.
 * Use `immediate` for reconnect / client bind / sync-cycle hooks.
 */
export function requestAnalyticsFlush(options: { immediate?: boolean } = {}): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const delay = options.immediate ? 0 : ANALYTICS_QUEUE_CONFIG.flushDebounceMs;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsQueue();
  }, delay);
}

/** Drain `analytics_queue` → PostHog when online and the SDK is bound. */
export async function flushAnalyticsQueue(): Promise<void> {
  if (flushInFlight) {
    return flushInFlight;
  }

  flushInFlight = (async () => {
    if (!sender || !isDatabaseInitialized()) {
      return;
    }
    if (!(await isOnline())) {
      return;
    }

    const pending = await getPendingAnalyticsEvents();
    for (const item of pending) {
      if (item.attempts >= ANALYTICS_QUEUE_CONFIG.maxRetries) {
        continue;
      }

      try {
        const properties = JSON.parse(item.properties || '{}') as Record<string, unknown>;
        const enriched = {
          ...properties,
          ...(item.distinctId ? { distinct_id: item.distinctId } : {}),
          queued_at: item.occurredAt,
        };

        if (item.kind === 'screen') {
          await sender.screen(item.name, enriched);
        } else {
          sender.capture(item.name, enriched);
        }
        await markAnalyticsEventComplete(item.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown analytics flush error';
        await markAnalyticsEventFailed(item.id, message);
      }
    }
  })().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}
