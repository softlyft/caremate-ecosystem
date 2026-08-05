/**
 * Legacy restore gate. Cold-start route restore was removed; helpers remain for tests.
 */

let restoreComplete = false;

export function isNavigationRestoreComplete(): boolean {
  return restoreComplete;
}

export function markNavigationRestoreComplete(): void {
  restoreComplete = true;
}

/** Test-only / rare re-entry helpers. */
export function resetNavigationRestoreGate(): void {
  restoreComplete = false;
}
