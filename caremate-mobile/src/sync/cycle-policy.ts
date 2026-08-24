export type SyncCyclePlan = {
  evaluateAlerts: boolean;
  migrateMiniApps: boolean;
  pushPending: boolean;
  pullRemote: boolean;
  rehydrateMiniApps: boolean;
};

const WRITE_REASONS = new Set(['write']);
const MIGRATE_REASONS = new Set(['startup', 'auth']);

/** Decide which expensive work a cycle should do for a given trigger. */
export function planSyncCycle(reason: string): SyncCyclePlan {
  const isWrite = WRITE_REASONS.has(reason);
  return {
    evaluateAlerts: !isWrite,
    migrateMiniApps: MIGRATE_REASONS.has(reason),
    pushPending: true,
    pullRemote: !isWrite,
    rehydrateMiniApps: !isWrite,
  };
}

/** If a cycle is already running, keep the request that still needs a pull. */
export function preferRicherSyncReason(queued: string | null, incoming: string): string {
  if (!queued) {
    return incoming;
  }
  const queuedPlan = planSyncCycle(queued);
  const incomingPlan = planSyncCycle(incoming);
  if (incomingPlan.pullRemote && !queuedPlan.pullRemote) {
    return incoming;
  }
  if (queuedPlan.pullRemote && !incomingPlan.pullRemote) {
    return queued;
  }
  return incoming;
}
