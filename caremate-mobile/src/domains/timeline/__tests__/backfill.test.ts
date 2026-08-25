import { GUEST_USER_ID } from '@/constants/guest';
import {
  backfillHealthTimelineFromSnapshots,
  projectMiniAppSnapshot,
} from '@/domains/timeline/backfill';

const mockIsDatabaseInitialized = jest.fn();
const mockFindByUserId = jest.fn();
const mockReplaceFromSnapshot = jest.fn();

jest.mock('@/database/client', () => ({
  isDatabaseInitialized: (...args: unknown[]) => mockIsDatabaseInitialized(...args),
}));

jest.mock('@/mini-apps/_kit/snapshot-repository', () => ({
  miniAppSnapshotRepository: {
    findByUserId: (...args: unknown[]) => mockFindByUserId(...args),
  },
}));

jest.mock('@/domains/timeline/repository', () => ({
  healthTimelineRepository: {
    replaceFromSnapshot: (...args: unknown[]) => mockReplaceFromSnapshot(...args),
  },
}));

describe('timeline/backfill', () => {
  beforeEach(() => {
    mockIsDatabaseInitialized.mockReset();
    mockFindByUserId.mockReset();
    mockReplaceFromSnapshot.mockReset();
  });

  it('skips projecting when db is uninitialized or user is guest', async () => {
    mockIsDatabaseInitialized.mockReturnValue(false);
    await projectMiniAppSnapshot({
      userId: 'user-1',
      appKey: 'vitals',
      payload: { entries: [] },
    });
    expect(mockReplaceFromSnapshot).not.toHaveBeenCalled();

    mockIsDatabaseInitialized.mockReturnValue(true);
    await projectMiniAppSnapshot({
      userId: GUEST_USER_ID,
      appKey: 'vitals',
      payload: { entries: [] },
    });
    expect(mockReplaceFromSnapshot).not.toHaveBeenCalled();
  });

  it('projects a snapshot for signed-in users', async () => {
    mockIsDatabaseInitialized.mockReturnValue(true);
    mockReplaceFromSnapshot.mockResolvedValue(undefined);
    await projectMiniAppSnapshot({
      userId: 'user-1',
      appKey: 'vitals',
      payload: { entries: [{ id: 'v1' }] },
    });
    expect(mockReplaceFromSnapshot).toHaveBeenCalledWith({
      userId: 'user-1',
      appKey: 'vitals',
      payload: { entries: [{ id: 'v1' }] },
    });
  });

  it('backfills all local snapshots for a signed-in user', async () => {
    mockIsDatabaseInitialized.mockReturnValue(true);
    mockFindByUserId.mockResolvedValue([
      { appKey: 'vitals', payload: { entries: [] } },
      { appKey: 'medication', payload: { medications: [] } },
    ]);
    mockReplaceFromSnapshot.mockResolvedValue(undefined);

    await backfillHealthTimelineFromSnapshots('user-1');

    expect(mockFindByUserId).toHaveBeenCalledWith('user-1');
    expect(mockReplaceFromSnapshot).toHaveBeenCalledTimes(2);
  });

  it('skips backfill for guest users', async () => {
    mockIsDatabaseInitialized.mockReturnValue(true);
    await backfillHealthTimelineFromSnapshots(GUEST_USER_ID);
    expect(mockFindByUserId).not.toHaveBeenCalled();
  });
});
