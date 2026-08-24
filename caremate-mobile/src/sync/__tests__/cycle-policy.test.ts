import { planSyncCycle, preferRicherSyncReason } from '@/sync/cycle-policy';

describe('planSyncCycle', () => {
  it('keeps write cycles push-only so navigation is not blocked by pull/rehydrate', () => {
    expect(planSyncCycle('write')).toEqual({
      evaluateAlerts: false,
      migrateMiniApps: false,
      pushPending: true,
      pullRemote: false,
      rehydrateMiniApps: false,
    });
  });

  it('runs a full pull cycle for foreground / interval / startup', () => {
    expect(planSyncCycle('foreground').pullRemote).toBe(true);
    expect(planSyncCycle('interval').pullRemote).toBe(true);
    expect(planSyncCycle('startup').migrateMiniApps).toBe(true);
    expect(planSyncCycle('auth').migrateMiniApps).toBe(true);
  });
});

describe('preferRicherSyncReason', () => {
  it('prefers a pull reason when coalescing with a write', () => {
    expect(preferRicherSyncReason('write', 'foreground')).toBe('foreground');
    expect(preferRicherSyncReason('foreground', 'write')).toBe('foreground');
    expect(preferRicherSyncReason(null, 'write')).toBe('write');
  });
});
