import { GUEST_USER_ID } from '@/constants/guest';
import { isDatabaseInitialized } from '@/database/client';
import { miniAppSnapshotRepository, type MiniAppKey } from '@/mini-apps/_kit/snapshot-repository';
import { healthTimelineRepository } from '@/domains/timeline/repository';

export async function projectMiniAppSnapshot(params: {
  userId: string;
  appKey: MiniAppKey;
  payload: Record<string, unknown>;
}): Promise<void> {
  if (!isDatabaseInitialized() || !params.userId || params.userId === GUEST_USER_ID) {
    return;
  }
  await healthTimelineRepository.replaceFromSnapshot(params);
}

/** Rebuild event rows from every local snapshot (sign-in / hydrate). */
export async function backfillHealthTimelineFromSnapshots(userId: string): Promise<void> {
  if (!isDatabaseInitialized() || !userId || userId === GUEST_USER_ID) {
    return;
  }

  const snapshots = await miniAppSnapshotRepository.findByUserId(userId);
  for (const snapshot of snapshots) {
    await healthTimelineRepository.replaceFromSnapshot({
      userId,
      appKey: snapshot.appKey,
      payload: snapshot.payload,
    });
  }
}
