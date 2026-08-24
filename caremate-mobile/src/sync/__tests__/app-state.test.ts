import { applyAppStateChange, createAppBackgroundGate } from '@/sync/app-state';

describe('applyAppStateChange', () => {
  it('ignores inactive ↔ active blips (iOS navigation / some Android recents)', () => {
    const gate = createAppBackgroundGate('active');
    expect(applyAppStateChange(gate, 'inactive').shouldForegroundSync).toBe(false);
    expect(applyAppStateChange(gate, 'active').shouldForegroundSync).toBe(false);
    expect(gate.wasBackgrounded).toBe(false);
  });

  it('syncs after iOS background → inactive → active', () => {
    const gate = createAppBackgroundGate('active');
    expect(applyAppStateChange(gate, 'inactive').shouldForegroundSync).toBe(false);
    expect(applyAppStateChange(gate, 'background').shouldForegroundSync).toBe(false);
    expect(gate.wasBackgrounded).toBe(true);
    expect(applyAppStateChange(gate, 'inactive').shouldForegroundSync).toBe(false);
    expect(applyAppStateChange(gate, 'active').shouldForegroundSync).toBe(true);
    expect(gate.wasBackgrounded).toBe(false);
  });

  it('syncs after classic Android active → background → active (no inactive)', () => {
    const gate = createAppBackgroundGate('active');
    expect(applyAppStateChange(gate, 'background').shouldForegroundSync).toBe(false);
    expect(gate.wasBackgrounded).toBe(true);
    expect(applyAppStateChange(gate, 'active').shouldForegroundSync).toBe(true);
    expect(gate.wasBackgrounded).toBe(false);
  });

  it('does not treat screen changes or unknown as a resume', () => {
    const gate = createAppBackgroundGate('active');
    expect(applyAppStateChange(gate, 'unknown').shouldForegroundSync).toBe(false);
    expect(applyAppStateChange(gate, 'active').shouldForegroundSync).toBe(false);
    expect(applyAppStateChange(gate, 'extension').shouldForegroundSync).toBe(false);
  });

  it('seeds from currentState so an Android process that starts backgrounded still resumes', () => {
    const gate = createAppBackgroundGate('background');
    expect(gate.wasBackgrounded).toBe(true);
    expect(applyAppStateChange(gate, 'active').shouldForegroundSync).toBe(true);
  });
});
