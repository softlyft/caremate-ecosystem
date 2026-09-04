import { headers } from 'next/headers';

import { hashClientIp } from '@/lib/otp-rate-limit';

/** Best-effort client IP for rate limiting (Amplify / proxies). */
export async function getRequestIpHash(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '';
  const first = forwarded.split(',')[0]?.trim() ?? '';
  return hashClientIp(first || null);
}
