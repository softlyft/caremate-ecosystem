import AsyncStorage from '@react-native-async-storage/async-storage';

import { GUEST_USER_ID } from '@/constants/guest';
import { isDatabaseInitialized } from '@/database/client';
import {
  MINI_APP_KEYS,
  MINI_APP_STORAGE_KEYS,
  miniAppSnapshotRepository,
} from '@/mini-apps/_kit/snapshot-repository';
import { rehydrateAllMiniAppStores } from '@/mini-apps/_kit/rehydrate-registry';
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

/**
 * After a cloud pull, copy SQLite snapshots into AsyncStorage and rehydrate registered stores.
 */
export async function rehydrateMiniAppsFromSnapshots(userId: string): Promise<void> {
  if (!isDatabaseInitialized() || !userId || userId === GUEST_USER_ID) {
    return;
  }

  const snapshots = await miniAppSnapshotRepository.findByUserId(userId);

  for (const snapshot of snapshots) {
    const storageKey = MINI_APP_STORAGE_KEYS[snapshot.appKey];
    const existingRaw = await AsyncStorage.getItem(storageKey);
    const existing = parseJson<{ state?: Record<string, unknown>; version?: number }>(
      existingRaw,
      {},
    );

    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({
        state: snapshot.payload,
        version: existing.version ?? 0,
      }),
    );
  }

  await rehydrateAllMiniAppStores();
}

/**
 * First-time upgrade: if AsyncStorage has data but SQLite has no snapshot, enqueue it for sync.
 */
export async function migrateMiniAppsToSnapshots(userId: string): Promise<void> {
  if (!isDatabaseInitialized() || !userId || userId === GUEST_USER_ID) {
    return;
  }

  for (const appKey of MINI_APP_KEYS) {
    const existing = await miniAppSnapshotRepository.findByUserAndApp(userId, appKey);
    if (existing) {
      continue;
    }

    const raw = await AsyncStorage.getItem(MINI_APP_STORAGE_KEYS[appKey]);
    if (!raw) {
      continue;
    }

    const wrapped = parseJson<{ state?: Record<string, unknown> }>(raw, {});
    const payload = stripActions(wrapped.state ?? {});
    if (Object.keys(payload).length === 0) {
      continue;
    }

    await miniAppSnapshotRepository.save({ userId, appKey, payload });
  }
}
