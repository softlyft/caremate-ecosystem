import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';
import { MINI_APPS, type MiniAppDefinition, type MiniAppId } from '@/mini-apps/_kit/registry';

const VALID_IDS = new Set<string>(MINI_APPS.map((app) => app.id));

function isMiniAppId(value: string): value is MiniAppId {
  return VALID_IDS.has(value);
}

/** Merge a saved id list with the current registry (drop unknown, append new). */
export function mergeMiniAppsOrder(savedIds: string[] | null | undefined): MiniAppDefinition[] {
  const byId = new Map(MINI_APPS.map((app) => [app.id, app]));
  const ordered: MiniAppDefinition[] = [];
  const seen = new Set<MiniAppId>();

  if (Array.isArray(savedIds)) {
    for (const id of savedIds) {
      if (!isMiniAppId(id) || seen.has(id)) {
        continue;
      }
      const app = byId.get(id);
      if (!app) {
        continue;
      }
      ordered.push(app);
      seen.add(id);
    }
  }

  for (const app of MINI_APPS) {
    if (!seen.has(app.id)) {
      ordered.push(app);
    }
  }

  return ordered;
}

export async function loadMiniAppsOrder(): Promise<MiniAppDefinition[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.miniAppsOrder);
    if (!raw) {
      return mergeMiniAppsOrder(null);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
      return mergeMiniAppsOrder(null);
    }
    return mergeMiniAppsOrder(parsed);
  } catch {
    return mergeMiniAppsOrder(null);
  }
}

export async function saveMiniAppsOrder(ids: MiniAppId[]): Promise<void> {
  const merged = mergeMiniAppsOrder(ids).map((app) => app.id);
  await AsyncStorage.setItem(STORAGE_KEYS.miniAppsOrder, JSON.stringify(merged));
}
