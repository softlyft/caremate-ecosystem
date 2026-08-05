import { router, type Href } from 'expo-router';

/**
 * When a leaf screen has no navigation history (deep link, replace),
 * `router.back()` is a no-op and the user would be trapped.
 * Prefer the nearest tab/home for that surface.
 */
export function resolveBackFallbackHref(pathname: string): Href {
  const path = pathname.toLowerCase();

  if (path.includes('/providers/connections')) {
    return '/(app)/(tabs)/profile';
  }
  if (path.includes('/providers')) {
    return '/(app)/(tabs)/providers';
  }
  if (path.includes('/articles')) {
    return '/(app)/(tabs)/articles';
  }
  if (path.includes('/apps')) {
    return '/(app)/(tabs)/apps';
  }
  if (
    path.includes('/profile') ||
    path.includes('/emergency') ||
    path.includes('/family') ||
    path.includes('/documents')
  ) {
    return '/(app)/(tabs)/profile';
  }

  return '/(app)/(tabs)';
}

/** Pop if possible; otherwise replace to a safe entry screen. */
export function routerBackOrFallback(fallbackHref: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref);
}
