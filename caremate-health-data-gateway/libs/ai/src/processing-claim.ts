/** Lease length for exclusive model work on a user turn (seconds). */
export const AI_PROCESSING_LEASE_SECONDS = 45;

/** How long a non-claimer waits for the peer turn to finish (ms). */
export const AI_PEER_WAIT_MS = 28_000;

/** Poll interval while waiting for a peer claimer (ms). */
export const AI_PEER_POLL_MS = 400;

export type AiClaimResult = {
  claimed: boolean;
  reason?: string | null;
  message_id?: string;
  status?: string;
  processing_claimed_at?: string | null;
};

/**
 * Sleep helper extracted for tests / injectable delay in wait loops.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll until `probe` returns a value or the deadline elapses.
 */
export async function waitUntil<T>(
  probe: () => Promise<T | null>,
  options: {
    timeoutMs: number;
    intervalMs: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<T | null> {
  const sleep = options.sleep ?? delay;
  const deadline = Date.now() + options.timeoutMs;
  for (;;) {
    const value = await probe();
    if (value) {
      return value;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return null;
    }
    await sleep(Math.min(options.intervalMs, remaining));
  }
}
