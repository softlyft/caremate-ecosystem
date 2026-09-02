import type { PostgrestError } from '@supabase/supabase-js';

/** Normalize Supabase RPC errors for Server Actions (must throw plain Error). */
export function toRpcError(
  error: PostgrestError | null | undefined,
  fallback = 'Request failed',
): Error {
  if (!error) {
    return new Error(fallback);
  }
  const message = error.message?.trim() || error.details?.trim() || fallback;
  return new Error(message);
}

export function rpcCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function positiveLimit(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
