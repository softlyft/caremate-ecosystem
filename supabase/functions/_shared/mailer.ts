/**
 * Pluggable transactional email for Edge Functions.
 *
 * Switch with:
 *   EMAIL_PROVIDER=smtp | ses | resend
 *
 * Shared From:
 *   EMAIL_FROM=hello@getcaremate.com
 *   EMAIL_FROM_NAME=CareMate
 *   (legacy aliases: SES_FROM_EMAIL / SES_FROM_NAME)
 *
 * Provider credentials — see supabase/functions/README.md
 */

import { SESClient, SendEmailCommand } from 'npm:@aws-sdk/client-ses@3.758.0';
import nodemailer from 'npm:nodemailer@6.9.16';

export type EmailProviderId = 'smtp' | 'ses' | 'resend';

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendResult =
  | { ok: true; messageId: string; provider: EmailProviderId }
  | { ok: false; skipped: true; reason: string; provider: EmailProviderId | 'none' }
  | { ok: false; skipped: false; error: string; provider: EmailProviderId };

export const DEFAULT_EMAIL_FROM = 'hello@getcaremate.com';
export const DEFAULT_EMAIL_FROM_NAME = 'CareMate';

/** @deprecated Prefer DEFAULT_EMAIL_FROM */
export const DEFAULT_SES_FROM_EMAIL = DEFAULT_EMAIL_FROM;
/** @deprecated Prefer DEFAULT_EMAIL_FROM_NAME */
export const DEFAULT_SES_FROM_NAME = DEFAULT_EMAIL_FROM_NAME;

function env(name: string): string {
  return Deno.env.get(name)?.trim() ?? '';
}

export function resolveEmailFromAddress(): string {
  const email = env('EMAIL_FROM') || env('SES_FROM_EMAIL') || DEFAULT_EMAIL_FROM;
  const name = env('EMAIL_FROM_NAME') || env('SES_FROM_NAME') || DEFAULT_EMAIL_FROM_NAME;
  return name ? `${name} <${email}>` : email;
}

export function resolveEmailFromEmail(): string {
  return env('EMAIL_FROM') || env('SES_FROM_EMAIL') || DEFAULT_EMAIL_FROM;
}

function hasSesCredentials(): boolean {
  return Boolean(env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY') && env('AWS_REGION'));
}

function hasSmtpCredentials(): boolean {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'));
}

function hasResendCredentials(): boolean {
  return Boolean(env('RESEND_API_KEY'));
}

/**
 * Explicit EMAIL_PROVIDER wins. If unset, auto-detect for local/dev convenience
 * (resend → ses → smtp). Production should set EMAIL_PROVIDER explicitly.
 */
export function resolveEmailProvider(): EmailProviderId | null {
  const raw = env('EMAIL_PROVIDER').toLowerCase();
  if (raw === 'smtp' || raw === 'ses' || raw === 'resend') {
    return raw;
  }
  if (raw && raw !== 'auto') {
    return null;
  }
  if (hasResendCredentials()) return 'resend';
  if (hasSesCredentials()) return 'ses';
  if (hasSmtpCredentials()) return 'smtp';
  return null;
}

export function isEmailConfigured(): boolean {
  const provider = resolveEmailProvider();
  if (!provider) return false;
  if (provider === 'ses') return hasSesCredentials();
  if (provider === 'smtp') return hasSmtpCredentials();
  if (provider === 'resend') return hasResendCredentials();
  return false;
}

/** @deprecated Use isEmailConfigured() */
export function isSesConfigured(): boolean {
  return isEmailConfigured();
}

async function sendViaSesProvider(input: EmailSendInput): Promise<EmailSendResult> {
  const client = new SESClient({
    region: env('AWS_REGION'),
    credentials: {
      accessKeyId: env('AWS_ACCESS_KEY_ID'),
      secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
    },
  });

  try {
    const result = await client.send(
      new SendEmailCommand({
        Source: resolveEmailFromAddress(),
        Destination: { ToAddresses: [input.to] },
        Message: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            Text: { Data: input.text, Charset: 'UTF-8' },
          },
        },
      }),
    );
    return { ok: true, messageId: result.MessageId ?? crypto.randomUUID(), provider: 'ses' };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'SES send failed',
      provider: 'ses',
    };
  }
}

async function sendViaSmtpProvider(input: EmailSendInput): Promise<EmailSendResult> {
  const port = Number.parseInt(env('SMTP_PORT') || '465', 10);
  const secureEnv = env('SMTP_SECURE').toLowerCase();
  const secure =
    secureEnv === 'true' || secureEnv === '1'
      ? true
      : secureEnv === 'false' || secureEnv === '0'
        ? false
        : port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host: env('SMTP_HOST'),
      port: Number.isFinite(port) ? port : 465,
      secure,
      auth: {
        user: env('SMTP_USER'),
        pass: env('SMTP_PASS'),
      },
    });

    const info = await transporter.sendMail({
      from: resolveEmailFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    const messageId =
      typeof info.messageId === 'string' && info.messageId.length > 0
        ? info.messageId
        : crypto.randomUUID();
    return { ok: true, messageId, provider: 'smtp' };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'SMTP send failed',
      provider: 'smtp',
    };
  }
}

async function sendViaResendProvider(input: EmailSendInput): Promise<EmailSendResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resolveEmailFromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        error: payload.message || payload.name || `Resend HTTP ${response.status}`,
        provider: 'resend',
      };
    }

    return {
      ok: true,
      messageId: payload.id ?? crypto.randomUUID(),
      provider: 'resend',
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'Resend send failed',
      provider: 'resend',
    };
  }
}

/** Send transactional email via the configured provider. */
export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const provider = resolveEmailProvider();
  if (!provider) {
    return {
      ok: false,
      skipped: true,
      reason: 'EMAIL_PROVIDER unset and no smtp/ses/resend credentials found',
      provider: 'none',
    };
  }

  if (provider === 'ses' && !hasSesCredentials()) {
    return {
      ok: false,
      skipped: true,
      reason: 'EMAIL_PROVIDER=ses but AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION missing',
      provider: 'ses',
    };
  }
  if (provider === 'smtp' && !hasSmtpCredentials()) {
    return {
      ok: false,
      skipped: true,
      reason: 'EMAIL_PROVIDER=smtp but SMTP_HOST / SMTP_USER / SMTP_PASS missing',
      provider: 'smtp',
    };
  }
  if (provider === 'resend' && !hasResendCredentials()) {
    return {
      ok: false,
      skipped: true,
      reason: 'EMAIL_PROVIDER=resend but RESEND_API_KEY missing',
      provider: 'resend',
    };
  }

  if (provider === 'ses') return sendViaSesProvider(input);
  if (provider === 'smtp') return sendViaSmtpProvider(input);
  return sendViaResendProvider(input);
}

/** @deprecated Use sendEmail() */
export async function sendViaSes(input: EmailSendInput): Promise<EmailSendResult> {
  return sendEmail(input);
}
