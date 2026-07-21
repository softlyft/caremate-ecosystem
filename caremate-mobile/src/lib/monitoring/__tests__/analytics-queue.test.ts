import { ANALYTICS_QUEUE_CONFIG } from '@/constants/config';
import {
  bindAnalyticsSender,
  enqueueAnalyticsEvent,
  flushAnalyticsQueue,
  getPendingAnalyticsEvents,
} from '@/lib/monitoring/analytics-queue';

const mockInsertValues = jest.fn(() => Promise.resolve());
const mockDeleteWhere = jest.fn(() => Promise.resolve());
const mockUpdateSet = jest.fn(() => ({
  where: jest.fn(() => Promise.resolve()),
}));
const mockSelectLimit = jest.fn();
const mockSelectOrderBy = jest.fn();

jest.mock('@/database/client', () => ({
  isDatabaseInitialized: () => true,
  getDatabase: () => ({
    insert: () => ({ values: mockInsertValues }),
    delete: () => ({ where: mockDeleteWhere }),
    update: () => ({ set: mockUpdateSet }),
    select: () => ({
      from: () => ({
        orderBy: mockSelectOrderBy,
        where: () => ({ limit: mockSelectLimit }),
      }),
    }),
  }),
}));

jest.mock('@/sync/network', () => ({
  isOnline: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/features/auth/store', () => ({
  useAuthStore: {
    getState: () => ({
      isInitialized: true,
      isGuest: false,
      user: { id: 'user-1', email: 'a@b.co' },
    }),
  },
}));

jest.mock('@/utils/helpers', () => ({
  createId: jest.fn(() => Promise.resolve('evt-1')),
  nowIso: jest.fn(() => '2026-07-18T12:00:00.000Z'),
}));

const { isOnline } = jest.requireMock('@/sync/network') as {
  isOnline: jest.Mock;
};

describe('analytics-queue', () => {
  const capture = jest.fn();
  const screen = jest.fn(() => Promise.resolve());

  beforeEach(() => {
    capture.mockClear();
    screen.mockClear();
    mockInsertValues.mockClear();
    mockDeleteWhere.mockClear();
    mockUpdateSet.mockClear();
    mockSelectOrderBy.mockReset();
    mockSelectLimit.mockReset();
    isOnline.mockResolvedValue(true);
    bindAnalyticsSender({ capture, screen });
  });

  afterEach(() => {
    bindAnalyticsSender(null);
  });

  it('enqueues events with distinct id from the signed-in user', async () => {
    await enqueueAnalyticsEvent({
      kind: 'event',
      name: 'auth_sign_in',
      properties: { method: 'email' },
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evt-1',
        kind: 'event',
        name: 'auth_sign_in',
        properties: JSON.stringify({ method: 'email' }),
        distinctId: 'user-1',
        occurredAt: '2026-07-18T12:00:00.000Z',
        attempts: 0,
      }),
    );
  });

  it('flushes pending events to PostHog when online', async () => {
    mockSelectOrderBy.mockResolvedValue([
      {
        id: 'evt-1',
        kind: 'event',
        name: 'auth_sign_in',
        properties: JSON.stringify({ method: 'email' }),
        distinctId: 'user-1',
        occurredAt: '2026-07-18T12:00:00.000Z',
        attempts: 0,
      },
      {
        id: 'scr-1',
        kind: 'screen',
        name: '/(app)/learn',
        properties: '{}',
        distinctId: null,
        occurredAt: '2026-07-18T12:01:00.000Z',
        attempts: 0,
      },
    ]);

    await flushAnalyticsQueue();

    expect(capture).toHaveBeenCalledWith('auth_sign_in', {
      method: 'email',
      distinct_id: 'user-1',
      queued_at: '2026-07-18T12:00:00.000Z',
    });
    expect(screen).toHaveBeenCalledWith('/(app)/learn', {
      queued_at: '2026-07-18T12:01:00.000Z',
    });
    expect(mockDeleteWhere).toHaveBeenCalledTimes(2);
  });

  it('skips flush when offline', async () => {
    isOnline.mockResolvedValue(false);
    mockSelectOrderBy.mockResolvedValue([
      {
        id: 'evt-1',
        kind: 'event',
        name: 'auth_sign_in',
        properties: '{}',
        distinctId: null,
        occurredAt: '2026-07-18T12:00:00.000Z',
        attempts: 0,
      },
    ]);

    await flushAnalyticsQueue();
    expect(capture).not.toHaveBeenCalled();
  });

  it('marks failures and skips rows past max retries', async () => {
    capture.mockImplementation(() => {
      throw new Error('network boom');
    });
    mockSelectOrderBy.mockResolvedValue([
      {
        id: 'evt-fail',
        kind: 'event',
        name: 'auth_sign_in',
        properties: '{}',
        distinctId: null,
        occurredAt: '2026-07-18T12:00:00.000Z',
        attempts: 0,
      },
      {
        id: 'evt-exhausted',
        kind: 'event',
        name: 'auth_sign_up',
        properties: '{}',
        distinctId: null,
        occurredAt: '2026-07-18T12:00:00.000Z',
        attempts: ANALYTICS_QUEUE_CONFIG.maxRetries,
      },
    ]);
    mockSelectLimit.mockResolvedValue([
      {
        id: 'evt-fail',
        attempts: 0,
      },
    ]);

    await flushAnalyticsQueue();

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        attempts: 1,
        lastError: 'network boom',
      }),
    );
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });

  it('getPendingAnalyticsEvents orders by createdAt', async () => {
    mockSelectOrderBy.mockResolvedValue([]);
    await expect(getPendingAnalyticsEvents()).resolves.toEqual([]);
    expect(mockSelectOrderBy).toHaveBeenCalled();
  });
});
