import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';

/** How long a last-route snapshot remains eligible after process death. */
export const LAST_ROUTE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const TAB_PATHS = new Set(['/', '/articles', '/providers', '/apps', '/profile']);

/** Query keys safe to re-attach on restore (tab filters). Dynamic route params live in the path. */
const RESTORABLE_QUERY_KEYS = new Set(['category', 'q']);

type StoredLastRoute = {
  href: string;
  savedAt: number;
};

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return '/';
  }
  const withoutQuery = trimmed.split('?')[0] ?? trimmed;
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || '/';
}

function isBlockedPath(pathname: string): boolean {
  if (pathname === '/index' || pathname === '/emergency-lock') {
    return true;
  }
  if (pathname.startsWith('/(auth)') || pathname.startsWith('/auth')) {
    return true;
  }
  if (pathname.startsWith('/billing')) {
    return true;
  }
  if (pathname.startsWith('/emergency/share')) {
    return true;
  }
  return false;
}

function appendRestorableQuery(
  href: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const search = new URLSearchParams();
  for (const key of RESTORABLE_QUERY_KEYS) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) {
      search.set(key, value.trim());
    } else if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
      search.set(key, value[0].trim());
    }
  }
  const query = search.toString();
  return query ? `${href}?${query}` : href;
}

/**
 * Map an Expo Router pathname (+ optional search params) to a restorable `/(app)/…` href.
 * Returns null for auth, billing, and other non-app surfaces.
 */
export function toRestorableAppHref(
  pathname: string,
  params: Record<string, string | string[] | undefined> = {},
): string | null {
  const path = normalizePathname(pathname);
  if (isBlockedPath(path)) {
    return null;
  }

  if (path.startsWith('/(app)/') || path === '/(app)') {
    return appendRestorableQuery(path === '/(app)' ? '/(app)/(tabs)' : path, params);
  }

  if (TAB_PATHS.has(path)) {
    if (path === '/') {
      return '/(app)/(tabs)';
    }
    return appendRestorableQuery(`/(app)/(tabs)${path}`, params);
  }

  return appendRestorableQuery(`/(app)${path}`, params);
}

export function isRestorableAppHref(href: string): boolean {
  const base = normalizePathname(href.split('?')[0] ?? href);
  if (!base.startsWith('/(app)')) {
    return false;
  }
  if (base.includes('/(auth)') || base.includes('/billing')) {
    return false;
  }
  if (base.includes('/emergency-lock') || base.includes('/emergency/share')) {
    return false;
  }
  return true;
}

export async function saveLastAppHref(href: string): Promise<void> {
  if (!isRestorableAppHref(href)) {
    return;
  }
  const payload: StoredLastRoute = { href, savedAt: Date.now() };
  await AsyncStorage.setItem(STORAGE_KEYS.lastAppRoute, JSON.stringify(payload));
}

export async function clearLastAppHref(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.lastAppRoute);
}

/**
 * Return a still-fresh last app route and clear it (consume-once).
 * Kept for tests / legacy callers — cold start no longer restores this href.
 */
export async function takeLastAppHref(
  now = Date.now(),
  maxAgeMs = LAST_ROUTE_MAX_AGE_MS,
): Promise<string | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.lastAppRoute);
  if (!raw) {
    return null;
  }
  await AsyncStorage.removeItem(STORAGE_KEYS.lastAppRoute);

  let parsed: StoredLastRoute | null = null;
  try {
    parsed = JSON.parse(raw) as StoredLastRoute;
  } catch {
    return null;
  }
  if (!parsed?.href || typeof parsed.savedAt !== 'number') {
    return null;
  }
  if (now - parsed.savedAt > maxAgeMs) {
    return null;
  }
  if (!isRestorableAppHref(parsed.href)) {
    return null;
  }
  return parsed.href;
}

export async function peekLastAppHref(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.lastAppRoute);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredLastRoute;
    return typeof parsed?.href === 'string' ? parsed.href : null;
  } catch {
    return null;
  }
}
