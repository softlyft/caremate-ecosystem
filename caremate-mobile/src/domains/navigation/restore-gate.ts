/**
 * Cold-start gate so NavigationPersistence does not overwrite a persisted deep
 * link with the bootstrap `/` (or tabs home) before index can restore it.
 *
 * Module state resets on process death — exactly when we need the gate again.
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
