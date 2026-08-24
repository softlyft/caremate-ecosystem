import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { GUEST_USER_ID } from '@/constants/guest';
import { isDatabaseInitialized } from '@/database/client';
import { useAuthStore } from '@/features/auth/store';
import {
  MINI_APP_KEYS,
  MINI_APP_STORAGE_KEYS,
  type MiniAppKey,
  miniAppSnapshotRepository,
} from '@/mini-apps/_kit/snapshot-repository';
import { projectMiniAppSnapshot } from '@/domains/timeline/backfill';
import { parseJson } from '@/utils/helpers';

function stripActions(state: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'function') {
      continue;
    }
    next[key] = value;
  }
  return next;
}

function resolveSyncUserId(): string | null {
  const { user, isGuest } = useAuthStore.getState();
  if (!user?.id || isGuest || user.id === GUEST_USER_ID) {
    return null;
  }
  return user.id;
}

const lastPersistedValue = new Map<MiniAppKey, string>();
const snapshotWriteTails = new Map<MiniAppKey, Promise<void>>();

function enqueueSnapshotWrite(appKey: MiniAppKey, task: () => Promise<void>): Promise<void> {
  const previous = snapshotWriteTails.get(appKey) ?? Promise.resolve();
  const next = previous.then(task, task);
  snapshotWriteTails.set(
    appKey,
    next.catch(() => undefined),
  );
  return next;
}

/** Scope AsyncStorage so guest and each account cannot share mini-app blobs. */
export function miniAppStorageScope(): string {
  const { user, isGuest } = useAuthStore.getState();
  if (!user?.id || isGuest || user.id === GUEST_USER_ID) {
    return 'guest';
  }
  return user.id;
}

export function scopedMiniAppStorageKey(baseName: string, scope = miniAppStorageScope()): string {
  return `${baseName}:${scope}`;
}

export function allMiniAppStorageKeysForUser(userId: string): string[] {
  const keys: string[] = [];
  for (const appKey of MINI_APP_KEYS) {
    const base = MINI_APP_STORAGE_KEYS[appKey];
    keys.push(scopedMiniAppStorageKey(base, userId));
    keys.push(base); // legacy unscoped key (pre-isolation)
  }
  return keys;
}

export async function clearMiniAppAsyncStorage(userId?: string | null): Promise<void> {
  const keys = new Set<string>();
  for (const appKey of MINI_APP_KEYS) {
    const base = MINI_APP_STORAGE_KEYS[appKey];
    keys.add(base);
    keys.add(scopedMiniAppStorageKey(base, 'guest'));
    if (userId) {
      keys.add(scopedMiniAppStorageKey(base, userId));
    }
  }
  await AsyncStorage.multiRemove([...keys]);
}

/**
 * Zustand persist storage that mirrors signed-in mini-app state into SQLite + sync_queue.
 * Physical AsyncStorage keys are user-scoped to prevent cross-account PHI re-attribution.
 */
export function createMiniAppSyncedStorage(appKey: MiniAppKey): StateStorage {
  return {
    getItem: async (name) => {
      const scoped = scopedMiniAppStorageKey(name);
      const scopedValue = await AsyncStorage.getItem(scoped);
      if (scopedValue != null) {
        lastPersistedValue.set(appKey, scopedValue);
        return scopedValue;
      }

      // One-time adoption of legacy unscoped key into the *current* scope only.
      const legacy = await AsyncStorage.getItem(name);
      if (legacy == null) {
        return null;
      }
      await AsyncStorage.setItem(scoped, legacy);
      await AsyncStorage.removeItem(name);
      lastPersistedValue.set(appKey, legacy);
      return legacy;
    },
    setItem: async (name, value) => {
      if (lastPersistedValue.get(appKey) === value) {
        return;
      }

      const scoped = scopedMiniAppStorageKey(name);
      await AsyncStorage.setItem(scoped, value);
      // Drop legacy key so it cannot be adopted by a later account.
      await AsyncStorage.removeItem(name);
      lastPersistedValue.set(appKey, value);

      const userId = resolveSyncUserId();
      if (!userId || !isDatabaseInitialized()) {
        return;
      }

      await enqueueSnapshotWrite(appKey, async () => {
        try {
          const wrapped = parseJson<{ state?: Record<string, unknown> }>(value, {});
          const payload = stripActions(wrapped.state ?? wrapped);
          const changed = await miniAppSnapshotRepository.save({ userId, appKey, payload });
          if (changed) {
            await projectMiniAppSnapshot({ userId, appKey, payload });
          }
        } catch {
          // Local UI persistence already succeeded; cloud mirror is best-effort.
        }
      });
    },
    removeItem: async (name) => {
      await AsyncStorage.multiRemove([scopedMiniAppStorageKey(name), name]);
    },
  };
}
