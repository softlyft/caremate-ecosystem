import AsyncStorage from '@react-native-async-storage/async-storage';

import { GUEST_USER_ID } from '@/constants/guest';
import { isDatabaseInitialized } from '@/database/client';
import {
  MINI_APP_KEYS,
  MINI_APP_STORAGE_KEYS,
  miniAppSnapshotRepository,
  type MiniAppKey,
} from '@/mini-apps/_kit/snapshot-repository';
import { scopedMiniAppStorageKey } from '@/mini-apps/_kit/synced-storage';
import { rehydrateAllMiniAppStores } from '@/mini-apps/_kit/rehydrate-registry';
import { backfillHealthTimelineFromSnapshots } from '@/domains/timeline/backfill';
import { isMiniAppPayloadEmpty } from '@/mini-apps/_kit/payload-empty';
import { isOnline } from '@/sync/network';
import { parseJson, stringifyJson } from '@/utils/helpers';

export { isMiniAppPayloadEmpty } from '@/mini-apps/_kit/payload-empty';

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

async function readLocalMiniAppState(
  userId: string,
  appKey: MiniAppKey,
): Promise<Record<string, unknown> | null> {
  const base = MINI_APP_STORAGE_KEYS[appKey];
  const storageKey = scopedMiniAppStorageKey(base, userId);
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }
  const wrapped = parseJson<{ state?: Record<string, unknown> }>(raw, {});
  return stripActions(wrapped.state ?? {});
}

/**
 * After a cloud pull, copy SQLite snapshots into user-scoped AsyncStorage and rehydrate stores.
 */
export async function rehydrateMiniAppsFromSnapshots(userId: string): Promise<void> {
  if (!isDatabaseInitialized() || !userId || userId === GUEST_USER_ID) {
    return;
  }

  const snapshots = await miniAppSnapshotRepository.findByUserId(userId);
  let anyChanged = false;

  for (const snapshot of snapshots) {
    const base = MINI_APP_STORAGE_KEYS[snapshot.appKey];
    const storageKey = scopedMiniAppStorageKey(base, userId);
    const existingRaw = await AsyncStorage.getItem(storageKey);
    const existing = parseJson<{ state?: Record<string, unknown>; version?: number }>(
      existingRaw,
      {},
    );
    const existingState = stripActions(existing.state ?? {});
    if (existingRaw && stringifyJson(existingState) === stringifyJson(snapshot.payload)) {
      continue;
    }

    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({
        state: snapshot.payload,
        version: existing.version ?? 0,
      }),
    );
    await AsyncStorage.removeItem(base);
    anyChanged = true;
  }

  if (!anyChanged) {
    return;
  }

  await rehydrateAllMiniAppStores();
  await backfillHealthTimelineFromSnapshots(userId);
}

/**
 * Sign-in / new-device restore: pull cloud snapshots, then apply into AsyncStorage
 * only when local mini-app state is empty so we never race ahead of first user edits.
 * Always rehydrates stores afterward so same-device login (after a guest cold start)
 * reloads user-scoped AsyncStorage that sign-out intentionally left intact.
 */
export async function hydrateMiniAppsFromRemote(userId: string): Promise<void> {
  if (!isDatabaseInitialized() || !userId || userId === GUEST_USER_ID) {
    return;
  }

  const online = await isOnline();
  if (online) {
    await miniAppSnapshotRepository.pullFromRemote();

    const snapshots = await miniAppSnapshotRepository.findByUserId(userId);

    for (const snapshot of snapshots) {
      if (isMiniAppPayloadEmpty(snapshot.payload)) {
        continue;
      }

      const local = await readLocalMiniAppState(userId, snapshot.appKey);
      if (!isMiniAppPayloadEmpty(local)) {
        // Local already has user data — do not clobber.
        continue;
      }

      const base = MINI_APP_STORAGE_KEYS[snapshot.appKey];
      const storageKey = scopedMiniAppStorageKey(base, userId);
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          state: snapshot.payload,
          version: 0,
        }),
      );
      await AsyncStorage.removeItem(base);
    }
  }

  await rehydrateAllMiniAppStores();
  await backfillHealthTimelineFromSnapshots(userId);
}

/**
 * First-time upgrade: enqueue user-scoped AsyncStorage into SQLite when no snapshot exists.
 * Never adopts another user's data — only `${base}:${userId}` (or migrates legacy once into that scope).
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

    const base = MINI_APP_STORAGE_KEYS[appKey];
    const scopedKey = scopedMiniAppStorageKey(base, userId);
    let raw = await AsyncStorage.getItem(scopedKey);

    if (!raw) {
      // Legacy unscoped key: adopt only into *this* user's scoped slot, then delete legacy.
      const legacy = await AsyncStorage.getItem(base);
      if (!legacy) {
        continue;
      }
      await AsyncStorage.setItem(scopedKey, legacy);
      await AsyncStorage.removeItem(base);
      raw = legacy;
    }

    const wrapped = parseJson<{ state?: Record<string, unknown> }>(raw, {});
    const payload = stripActions(wrapped.state ?? {});
    if (isMiniAppPayloadEmpty(payload)) {
      continue;
    }

    await miniAppSnapshotRepository.save({ userId, appKey, payload });
  }

  await backfillHealthTimelineFromSnapshots(userId);
}
