'use server';

import {
  completePasswordReset,
  createPasswordResetChallenge,
  verifyPasswordResetChallenge,
} from '@/domains/password-reset/repository';
import { logError } from '@/lib/observability';
import { getRequestIpHash } from '@/lib/request-ip';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function startPasswordResetAction(input: {
  email: string;
}): Promise<ActionResult<{ resetId: string; expiresAt: string; message: string }>> {
  try {
    const ipHash = await getRequestIpHash();
    const data = await createPasswordResetChallenge({ email: input.email, ipHash });
    return { ok: true, data };
  } catch (err) {
    logError('password-reset-start', err, { emailDomain: input.email.split('@')[1] ?? null });
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not start password reset',
    };
  }
}

export async function verifyPasswordResetAction(input: {
  resetId: string;
  code: string;
}): Promise<ActionResult<{ email: string }>> {
  try {
    const data = await verifyPasswordResetChallenge(input);
    return { ok: true, data };
  } catch (err) {
    logError('password-reset-verify', err, { resetId: input.resetId });
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Verification failed',
    };
  }
}

export async function completePasswordResetAction(input: {
  resetId: string;
  password: string;
}): Promise<ActionResult<{ email: string }>> {
  try {
    const data = await completePasswordReset(input);
    return { ok: true, data };
  } catch (err) {
    logError('password-reset-complete', err, { resetId: input.resetId });
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reset password',
    };
  }
}
