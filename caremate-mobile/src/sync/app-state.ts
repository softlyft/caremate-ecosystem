import type { AppStateStatus } from 'react-native';

/**
 * Tracks whether the app actually left the foreground (`background`).
 * iOS uses `inactive` for navigation / Control Center; Android usually skips
 * `inactive` and goes `active` ↔ `background` (recents, Home, permission sheets
 * on some OEMs may still emit `inactive`).
 */
export type AppBackgroundGate = {
  wasBackgrounded: boolean;
};

export function createAppBackgroundGate(current: AppStateStatus = 'active'): AppBackgroundGate {
  return { wasBackgrounded: current === 'background' };
}

/**
 * Foreground sync only after a real resume from `background`.
 * `inactive` ↔ `active` (iOS nav, Android recents/shade on some devices) is ignored.
 */
export function applyAppStateChange(
  gate: AppBackgroundGate,
  next: AppStateStatus,
): { shouldForegroundSync: boolean } {
  if (next === 'background') {
    gate.wasBackgrounded = true;
    return { shouldForegroundSync: false };
  }
  if (next === 'active' && gate.wasBackgrounded) {
    gate.wasBackgrounded = false;
    return { shouldForegroundSync: true };
  }
  return { shouldForegroundSync: false };
}
