import {
  createInAppNotification,
  ensureWelcomeInAppNotification,
  markNotificationsRead,
} from '@/domains/notifications/service';

const mockCreate = jest.fn();
const mockMarkAllRead = jest.fn();
const mockInvalidate = jest.fn();

jest.mock('@/domains/notifications/repository', () => ({
  notificationRepository: {
    create: (...args: unknown[]) => mockCreate(...args),
    markAllRead: (...args: unknown[]) => mockMarkAllRead(...args),
  },
}));

jest.mock('@/lib/query-client', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => mockInvalidate(...args),
  },
}));

jest.mock('@/domains/localization', () => ({
  translateText: (_lang: string, key: string) => key,
}));

describe('notification service', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockMarkAllRead.mockReset();
    mockInvalidate.mockReset();
    mockCreate.mockResolvedValue(undefined);
    mockMarkAllRead.mockResolvedValue(undefined);
  });

  it('creates notifications and invalidates the inbox query', async () => {
    await createInAppNotification({
      userId: 'user-1',
      domain: 'system',
      eventType: 'welcome',
      title: 'Hello',
      body: 'World',
      severity: 'info',
    });
    expect(mockCreate).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('marks notifications read', async () => {
    await markNotificationsRead('user-1');
    expect(mockMarkAllRead).toHaveBeenCalledWith('user-1');
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('creates a welcome notification for guests by default', async () => {
    await ensureWelcomeInAppNotification({ languageCode: 'en' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'welcome',
        dedupeKey: 'system:welcome',
      }),
    );
  });

  it('swallows welcome notification failures', async () => {
    mockCreate.mockRejectedValue(new Error('db down'));
    await expect(
      ensureWelcomeInAppNotification({ userId: 'user-1', languageCode: 'en' }),
    ).resolves.toBeUndefined();
  });
});
