import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { GUEST_USER_ID } from '@/constants/guest';
import { isDatabaseInitialized } from '@/database/client';
import { useAuthStore } from '@/features/auth/store';
import { type MiniAppKey, miniAppSnapshotRepository } from '@/mini-apps/_kit/snapshot-repository';
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

/**
 * Zustand persist storage that mirrors signed-in mini-app state into SQLite + sync_queue.
 * Guest / offline UI still uses AsyncStorage as the fast local cache.
 */
export function createMiniAppSyncedStorage(appKey: MiniAppKey): StateStorage {
  return {
    getItem: async (name) => AsyncStorage.getItem(name),
    setItem: async (name, value) => {
      await AsyncStorage.setItem(name, value);

      const userId = resolveSyncUserId();
      if (!userId || !isDatabaseInitialized()) {
        return;
      }

      try {
        const wrapped = parseJson<{ state?: Record<string, unknown> }>(value, {});
        const payload = stripActions(wrapped.state ?? wrapped);
        await miniAppSnapshotRepository.save({ userId, appKey, payload });
      } catch {
        // Local UI persistence already succeeded; cloud mirror is best-effort.
      }
    },
    removeItem: async (name) => {
      await AsyncStorage.removeItem(name);
    },
  };
}
