import type { PostgrestError } from '@supabase/supabase-js';

/** Extract a user-facing message from Error, PostgrestError-like objects, or strings. */
export function extractErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (err == null) return fallback;
  if (typeof err === 'string') {
    const trimmed = err.trim();
    return trimmed || fallback;
  }
  if (err instanceof Error) {
    const trimmed = err.message?.trim();
    return trimmed || fallback;
  }
  if (typeof err === 'object') {
    const record = err as Record<string, unknown>;
    for (const key of ['message', 'details', 'hint', 'error_description', 'error'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return fallback;
}

/** Normalize Supabase RPC errors for Server Actions (must throw plain Error). */
export function toRpcError(
  error: PostgrestError | null | undefined,
  fallback = 'Request failed',
): Error {
  if (!error) {
    return new Error(fallback);
  }
  return new Error(extractErrorMessage(error, fallback));
}

export function rpcCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function positiveLimit(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
