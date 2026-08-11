'use server';

import { createHash, randomBytes, randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { POINT_VALUES } from '@/constants/points';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CommunityChapter } from '@/types/database';

const JOIN_VERIFICATION_COOKIE = 'community_join_verification';
const VERIFICATION_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const patientIdSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'Enter a valid 12-digit CareMate Patient ID');
const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'your registered email';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

async function getVerifiedUserId(): Promise<{
  verificationId: string;
  userId: string;
} | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(JOIN_VERIFICATION_COOKIE)?.value;
  if (!value) return null;

  const [verificationId, token] = value.split('.');
  if (!verificationId || !token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('community_join_verifications')
    .select('id, user_id, session_token_hash, expires_at, verified_at, consumed_at')
    .eq('id', verificationId)
    .maybeSingle();

  if (
    error ||
    !data ||
    !data.verified_at ||
    data.consumed_at ||
    data.session_token_hash !== hash(token) ||
    new Date(data.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  return { verificationId: data.id, userId: data.user_id };
}

export async function startPatientVerificationAction(formData: FormData) {
  const patientId = patientIdSchema.parse(formData.get('patient_id'));
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id, email')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    throw new Error('No registered CareMate account matches that Patient ID');
  }

  const { data: authResult, error: authError } = await admin.auth.admin.getUserById(
    profile.user_id,
  );
  if (authError || !authResult.user) {
    throw new Error('No registered CareMate account matches that Patient ID');
  }

  const email = profile.email || authResult.user.email;
  if (!email) throw new Error('Your CareMate account does not have a registered email');

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60_000).toISOString();
  const { data: verification, error } = await admin
    .from('community_join_verifications')
    .insert({
      user_id: profile.user_id,
      code_hash: hash(code),
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) throw error;

  // OTP is emailed out-of-band only — never returned to the browser.
  const mail = await sendCommunityJoinOtpEmail({
    to: email,
    code,
    expiresMinutes: VERIFICATION_TTL_MINUTES,
  });
  if (!mail.delivered) {
    throw new Error(
      mail.skipped
        ? 'Verification email is not configured yet. Try again later or contact support.'
        : (mail.error ?? 'Could not send verification email. Try again later.'),
    );
  }

  return {
    verificationId: verification.id,
    maskedEmail: maskEmail(email),
    expiresAt,
  };
}

async function sendCommunityJoinOtpEmail(input: {
  to: string;
  code: string;
  expiresMinutes: number;
}): Promise<{ delivered: boolean; skipped: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { delivered: false, skipped: true, error: 'Supabase env missing' };
  }

  try {
    const response = await fetch(
      `${url.replace(/\/$/, '')}/functions/v1/send-community-join-otp`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: input.to,
          code: input.code,
          expiresMinutes: input.expiresMinutes,
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      skipped?: boolean;
      error?: string;
      reason?: string;
    };

    if (response.ok && payload.ok) {
      return { delivered: true, skipped: false };
    }

    if (response.status === 503 || payload.skipped) {
      return {
        delivered: false,
        skipped: true,
        error: payload.reason ?? payload.error ?? 'SES not configured',
      };
    }

    return {
      delivered: false,
      skipped: false,
      error: payload.error ?? `Email send failed (${response.status})`,
    };
  } catch (err) {
    return {
      delivered: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'Email send failed',
    };
  }
}

export async function verifyPatientCodeAction(formData: FormData) {
  const verificationId = z.string().uuid().parse(formData.get('verification_id'));
  const code = codeSchema.parse(formData.get('code'));
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('community_join_verifications')
    .select('id, code_hash, attempts, expires_at, verified_at, consumed_at')
    .eq('id', verificationId)
    .maybeSingle();

  if (error) throw error;
  if (
    !data ||
    data.consumed_at ||
    new Date(data.expires_at).getTime() <= Date.now() ||
    data.attempts >= MAX_ATTEMPTS
  ) {
    throw new Error('This verification code has expired. Request a new one.');
  }

  if (data.code_hash !== hash(code)) {
    await admin
      .from('community_join_verifications')
      .update({ attempts: data.attempts + 1 })
      .eq('id', verificationId);
    throw new Error('Incorrect verification code');
  }

  const sessionToken = randomBytes(32).toString('hex');
  const { error: updateError } = await admin
    .from('community_join_verifications')
    .update({
      verified_at: data.verified_at || new Date().toISOString(),
      session_token_hash: hash(sessionToken),
    })
    .eq('id', verificationId);
  if (updateError) throw updateError;

  const cookieStore = await cookies();
  cookieStore.set(JOIN_VERIFICATION_COOKIE, `${verificationId}.${sessionToken}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/join',
    maxAge: VERIFICATION_TTL_MINUTES * 60,
  });

  return { verified: true };
}

export async function listJoinableChaptersAction(query = ''): Promise<CommunityChapter[]> {
  const verified = await getVerifiedUserId();
  if (!verified) throw new Error('Verify your CareMate Patient ID first');

  const admin = createAdminClient();
  let request = admin
    .from('community_chapters')
    .select('*')
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(50);

  if (query.trim()) {
    const safeQuery = query.trim().replaceAll(',', ' ');
    request = request.or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as CommunityChapter[];
}

export async function joinChapterAction(formData: FormData) {
  const verified = await getVerifiedUserId();
  if (!verified) throw new Error('Your verification has expired. Verify again.');

  const chapterId = z.string().uuid().parse(formData.get('chapter_id'));
  const admin = createAdminClient();
  const { data: chapter, error: chapterError } = await admin
    .from('community_chapters')
    .select('id, name')
    .eq('id', chapterId)
    .eq('status', 'active')
    .maybeSingle();

  if (chapterError) throw chapterError;
  if (!chapter) throw new Error('That chapter is no longer available');

  const now = new Date().toISOString();
  const { error: membershipError } = await admin.from('community_memberships').upsert(
    {
      user_id: verified.userId,
      chapter_id: chapterId,
      role: 'member',
      status: 'approved',
      reviewed_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id,chapter_id' },
  );
  if (membershipError) throw membershipError;

  const { count } = await admin
    .from('community_contributions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', verified.userId)
    .eq('action_type', 'onboarding');

  if ((count ?? 0) === 0) {
    const { error: contributionError } = await admin.from('community_contributions').insert({
      user_id: verified.userId,
      chapter_id: chapterId,
      action_type: 'onboarding',
      description: 'Joined the CareMate community',
      points: POINT_VALUES.onboarding,
      recorded_by: verified.userId,
    });
    if (contributionError) throw contributionError;
  }

  await admin.from('community_notifications').insert({
    user_id: verified.userId,
    type: 'membership_approved',
    title: `Welcome to ${chapter.name}`,
    body: 'Your community membership is active.',
    link_path: '/app/dashboard',
  });

  await admin
    .from('community_join_verifications')
    .update({ consumed_at: now })
    .eq('id', verified.verificationId);

  const cookieStore = await cookies();
  cookieStore.delete(JOIN_VERIFICATION_COOKIE);

  return { chapterName: chapter.name };
}
