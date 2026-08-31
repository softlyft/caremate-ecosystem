'use server';

import { cookies } from 'next/headers';

import { CARE_ACTIVE_KIND_COOKIE } from '@/constants/cookies';
import { getCareSession } from '@/lib/auth';
import { careKindFromPortalPath, sanitizePostLoginPath } from '@/lib/safe-redirect';

export type PostLoginRedirectResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/** Resolve post-login destination using server-readable cookies and membership. */
export async function resolvePostLoginRedirectAction(
  next: string | null | undefined,
): Promise<PostLoginRedirectResult> {
  const session = await getCareSession();
  if (!session) {
    return {
      ok: false,
      error: 'This account is not a member of any care organization.',
    };
  }

  const path = sanitizePostLoginPath(next, session.homePath);
  const kind = careKindFromPortalPath(path);

  if (kind === 'payer' && !session.hasPayer) {
    return { ok: false, error: 'This account has no payer organization membership.' };
  }
  if (kind === 'provider' && !session.hasProvider) {
    return { ok: false, error: 'This account has no provider organization membership.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(CARE_ACTIVE_KIND_COOKIE, kind, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, path };
}
