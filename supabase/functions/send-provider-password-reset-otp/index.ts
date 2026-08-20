import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { renderProviderPasswordResetOtp } from '../_shared/email-templates/index.ts';
import { isEmailConfigured, sendEmail } from '../_shared/mailer.ts';

/**
 * Service-role: send provider password-reset OTP.
 * Body: { to, code, expiresMinutes? }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!serviceKey || token !== serviceKey) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as {
      to?: string;
      code?: string;
      expiresMinutes?: number;
    };

    const to = body.to?.trim().toLowerCase() ?? '';
    const code = body.code?.trim() ?? '';
    if (!to.includes('@') || !/^\d{6}$/.test(code)) {
      return jsonResponse({ error: 'to and 6-digit code are required' }, 400);
    }

    if (!isEmailConfigured()) {
      return jsonResponse({ ok: false, skipped: true, reason: 'Email provider not configured' }, 503);
    }

    const mail = renderProviderPasswordResetOtp({
      code,
      expiresMinutes: body.expiresMinutes ?? 15,
    });

    const result = await sendEmail({
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (!result.ok) {
      if ('skipped' in result && result.skipped) {
        return jsonResponse({ ok: false, skipped: true, reason: result.reason }, 503);
      }
      return jsonResponse({ ok: false, error: 'error' in result ? result.error : 'Send failed' }, 502);
    }

    return jsonResponse({ ok: true, messageId: result.messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
