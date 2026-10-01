import { resolveNotificationHref } from '@/domains/notifications/resolve-href';
import type { InAppNotification } from '@/domains/notifications/types';

function base(partial: Partial<InAppNotification>): InAppNotification {
  return {
    id: 'n1',
    userId: 'u1',
    domain: 'system',
    eventType: 'info',
    title: 'Title',
    body: 'Body',
    severity: 'info',
    entityType: null,
    entityId: null,
    data: {},
    dedupeKey: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('resolveNotificationHref', () => {
  it('prefers data.path and normalizes to /(app)', () => {
    const href = resolveNotificationHref(
      base({
        domain: 'providers',
        data: { path: '/providers/connections/requests' },
      }),
    );
    expect(href).toBe('/(app)/providers/connections/requests');
  });

  it('routes provider connection notifications to requests', () => {
    const href = resolveNotificationHref(
      base({
        domain: 'providers',
        eventType: 'connection_request',
        body: 'Open Connections to respond.',
      }),
    );
    expect(href).toBe('/(app)/providers/connections/requests');
  });

  it('returns null when no route is known', () => {
    expect(resolveNotificationHref(base({ domain: 'system' }))).toBeNull();
  });
});
