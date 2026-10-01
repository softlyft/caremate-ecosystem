import type { Href } from 'expo-router';

import type { InAppNotification } from '@/domains/notifications/types';

const APP_PREFIX = '/(app)';

/**
 * Map an inbox notification to an in-app route when one is available.
 * Prefers `data.path` from the push/inbox payload, then domain/event heuristics.
 */
export function resolveNotificationHref(notification: InAppNotification): Href | null {
  const data = notification.data ?? {};
  const rawPath = typeof data.path === 'string' ? data.path.trim() : '';
  if (rawPath) {
    return normalizeAppHref(rawPath);
  }

  const domain = String(notification.domain ?? data.domain ?? '');
  const eventType = String(notification.eventType ?? data.eventType ?? data.event_type ?? '');

  if (domain === 'providers' || domain === 'nearby') {
    if (eventType.includes('request') || eventType.includes('connection')) {
      return '/(app)/providers/connections/requests';
    }
    return '/(app)/providers/connections';
  }

  if (domain === 'family') {
    if (
      eventType === 'connection_request_received' ||
      eventType === 'connection_request_accepted' ||
      eventType === 'connection_request_declined'
    ) {
      return '/(app)/family/requests';
    }
    return '/(app)/family';
  }

  return null;
}

function normalizeAppHref(path: string): Href {
  if (path.startsWith(APP_PREFIX)) {
    return path as Href;
  }
  if (path.startsWith('/(app)')) {
    return path as Href;
  }
  if (path.startsWith('/')) {
    return `${APP_PREFIX}${path}` as Href;
  }
  return `${APP_PREFIX}/${path}` as Href;
}
