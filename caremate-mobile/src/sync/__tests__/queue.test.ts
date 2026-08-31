import {
  enqueueSyncOperation,
  getSyncQueueSummary,
  markSyncOperationComplete,
  markSyncOperationFailed,
  retryFailedSyncOperations,
  subscribeToSyncQueue,
} from '@/sync/queue';

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/database/client', () => ({
  getDatabase: () => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  }),
}));

jest.mock('@/utils/helpers', () => ({
  createId: jest.fn(async () => 'queue-id-1'),
  nowIso: jest.fn(() => '2026-01-01T00:00:00.000Z'),
}));

jest.mock('@/sync/engine', () => ({
  syncEngine: {
    requestSync: jest.fn(),
  },
}));

describe('sync queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockImplementation(() => ({
      values: jest.fn(async () => undefined),
    }));
    mockSelect.mockImplementation(() => ({
      from: jest.fn(() => ({
        orderBy: jest.fn(async () => []),
        where: jest.fn(() => ({
          limit: jest.fn(async () => []),
        })),
      })),
    }));
    mockUpdate.mockImplementation(() => ({
      set: jest.fn(() => ({
        where: jest.fn(async () => undefined),
      })),
    }));
    mockDelete.mockImplementation(() => ({
      where: jest.fn(async () => undefined),
    }));
  });

  it('enqueues operations and persists to the sync queue', async () => {
    await enqueueSyncOperation({
      entityType: 'emergency_profile',
      entityId: 'ep-1',
      operation: 'update',
      payload: { id: 'ep-1' },
    });

    expect(mockInsert).toHaveBeenCalled();
  });

  it('notifies subscribers when the queue changes', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSyncQueue(listener);

    await markSyncOperationComplete('queue-id-1');
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    await markSyncOperationComplete('queue-id-2');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('summarizes pending vs failed items', async () => {
    mockSelect.mockImplementation(() => ({
      from: jest.fn(() => ({
        orderBy: jest.fn(async () => [
          { id: '1', attempts: 0 },
          { id: '2', attempts: 5 },
          { id: '3', attempts: 1 },
        ]),
      })),
    }));

    await expect(getSyncQueueSummary()).resolves.toEqual({
      pendingCount: 2,
      failedCount: 1,
    });
  });

  it('increments attempts when marking failures', async () => {
    mockSelect.mockImplementation(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(async () => [{ id: 'queue-id-1', attempts: 2 }]),
        })),
      })),
    }));

    await markSyncOperationFailed('queue-id-1', 'timeout');

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('resets failed operations for manual retry', async () => {
    await retryFailedSyncOperations();
    expect(mockUpdate).toHaveBeenCalled();
  });
});
