import { InteractionManager } from 'react-native';

import { SYNC_CONFIG } from '@/constants/config';

import { syncEngine } from '@/sync/engine';

const mockIsOnline = jest.fn();
const mockWatchNetworkStatus = jest.fn();
const mockGetPendingSyncOperations = jest.fn();
const mockMarkSyncOperationComplete = jest.fn();
const mockMarkSyncOperationFailed = jest.fn();
const mockGetSyncHandler = jest.fn();
const mockGetRegisteredSyncHandlers = jest.fn();
const mockRegisterDefaultSyncHandlers = jest.fn();
const mockGetDatabase = jest.fn();
const mockFlushAnalyticsQueue = jest.fn();

jest.mock('@/constants/env', () => ({
  config: {
    isSupabaseConfigured: true,
  },
}));

jest.mock('@/sync/network', () => ({
  isOnline: (...args: unknown[]) => mockIsOnline(...args),
  watchNetworkStatus: (...args: unknown[]) => mockWatchNetworkStatus(...args),
}));

jest.mock('@/sync/queue', () => ({
  getPendingSyncOperations: (...args: unknown[]) => mockGetPendingSyncOperations(...args),
  markSyncOperationComplete: (...args: unknown[]) => mockMarkSyncOperationComplete(...args),
  markSyncOperationFailed: (...args: unknown[]) => mockMarkSyncOperationFailed(...args),
}));

jest.mock('@/sync/registry', () => ({
  registerDefaultSyncHandlers: (...args: unknown[]) => mockRegisterDefaultSyncHandlers(...args),
  getSyncHandler: (...args: unknown[]) => mockGetSyncHandler(...args),
  getRegisteredSyncHandlers: (...args: unknown[]) => mockGetRegisteredSyncHandlers(...args),
}));

jest.mock('@/features/auth/store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: { id: 'user-1' },
      isGuest: false,
    })),
  },
}));

jest.mock('@/database/client', () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock('@/mini-apps/_kit/hydrate', () => ({
  migrateMiniAppsToSnapshots: jest.fn(async () => undefined),
  rehydrateMiniAppsFromSnapshots: jest.fn(async () => undefined),
}));

jest.mock('@/mini-apps/_kit/bootstrap', () => ({}));

jest.mock('@/lib/monitoring/analytics-queue', () => ({
  flushAnalyticsQueue: (...args: unknown[]) => mockFlushAnalyticsQueue(...args),
}));

jest.mock('@/sync/register-default-handlers', () => ({
  registerDefaultSyncHandlers: jest.fn(),
}));

jest.mock('@/utils/helpers', () => ({
  nowIso: jest.fn(() => '2026-01-01T00:00:00.000Z'),
}));

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    }),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('syncEngine', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await syncEngine.stop();
    jest.clearAllMocks();
    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
      (callback: () => void) => {
        callback();
        return { cancel: jest.fn() };
      },
    );

    mockWatchNetworkStatus.mockResolvedValue(() => undefined);
    mockIsOnline.mockResolvedValue(true);
    mockGetPendingSyncOperations.mockResolvedValue([]);
    mockGetRegisteredSyncHandlers.mockReturnValue([]);
    mockGetDatabase.mockReturnValue({
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(async () => []),
          })),
        })),
      })),
      insert: jest.fn(async () => undefined),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(async () => undefined),
        })),
      })),
    });
  });

  afterEach(async () => {
    await syncEngine.stop();
    jest.useRealTimers();
  });

  it('ignores requestSync before start()', () => {
    syncEngine.requestSync({ reason: 'write' });
    jest.advanceTimersByTime(SYNC_CONFIG.writeDebounceMs + 500);
    expect(mockIsOnline).not.toHaveBeenCalled();
  });

  it('debounces write-triggered cycles until the UI is idle', async () => {
    await syncEngine.start();
    mockIsOnline.mockClear();

    syncEngine.requestSync({ reason: 'write' });
    expect(mockIsOnline).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(SYNC_CONFIG.writeDebounceMs);
    expect(mockIsOnline).toHaveBeenCalled();
  });

  it('runs immediate cycles without write debounce', async () => {
    await syncEngine.start();
    mockIsOnline.mockClear();

    syncEngine.requestSync({ reason: 'foreground', immediate: true });
    await jest.advanceTimersByTimeAsync(0);
    expect(mockIsOnline).toHaveBeenCalled();
  });

  it('skips remote sync when offline', async () => {
    mockIsOnline.mockResolvedValue(false);
    await syncEngine.start();
    mockGetPendingSyncOperations.mockClear();

    await syncEngine.runSyncCycle({ reason: 'startup' });

    expect(mockGetPendingSyncOperations).not.toHaveBeenCalled();
  });

  it('drains pending queue items with registered handlers', async () => {
    const push = jest.fn(async () => undefined);
    mockGetPendingSyncOperations.mockResolvedValue([
      {
        id: 'q-1',
        entityType: 'emergency_profile',
        entityId: 'ep-1',
        operation: 'upsert',
        payload: '{"id":"ep-1"}',
        attempts: 0,
      },
    ]);
    mockGetSyncHandler.mockReturnValue({ push, pull: jest.fn() });

    await syncEngine.runSyncCycle({ reason: 'write' });

    expect(push).toHaveBeenCalledWith('ep-1', 'upsert', { id: 'ep-1' });
    expect(mockMarkSyncOperationComplete).toHaveBeenCalledWith('q-1');
  });

  it('marks failed pushes and skips items past max retries', async () => {
    const push = jest.fn(async () => {
      throw new Error('network down');
    });
    mockGetPendingSyncOperations.mockResolvedValue([
      {
        id: 'q-fail',
        entityType: 'emergency_profile',
        entityId: 'ep-1',
        operation: 'upsert',
        payload: '{}',
        attempts: 0,
      },
      {
        id: 'q-dead',
        entityType: 'emergency_profile',
        entityId: 'ep-2',
        operation: 'upsert',
        payload: '{}',
        attempts: SYNC_CONFIG.maxRetries,
      },
    ]);
    mockGetSyncHandler.mockReturnValue({ push, pull: jest.fn() });

    await syncEngine.runSyncCycle({ reason: 'write' });

    expect(mockMarkSyncOperationFailed).toHaveBeenCalledWith('q-fail', 'network down');
    expect(mockMarkSyncOperationComplete).not.toHaveBeenCalledWith('q-dead');
  });

  it('coalesces queued reasons while a cycle is in flight', async () => {
    await syncEngine.start();
    let resolveOnline: (value: boolean) => void = () => undefined;
    mockIsOnline.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveOnline = resolve;
        }),
    );

    const cycle = syncEngine.runSyncCycle({ reason: 'write' });
    syncEngine.requestSync({ reason: 'foreground', immediate: true });

    resolveOnline(true);
    await cycle;
    await jest.advanceTimersByTimeAsync(0);

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
  });
});
