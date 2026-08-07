#!/usr/bin/env node
/**
 * Push CareMate Auth email templates (OTP, not magic link) to a hosted Supabase project.
 *
 * Hosted Dashboard templates are independent of local `supabase/config.toml`.
 * Without this sync (or a manual Dashboard paste), Reset password / Confirm signup
 * keep Supabase defaults: generic copy + {{ .ConfirmationURL }} link.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=abcd1234 \
 *     node scripts/sync-supabase-auth-email-templates.mjs
 *
 * Token: https://supabase.com/dashboard/account/tokens
 * Project ref: Dashboard → Project Settings → General → Reference ID
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();

if (!token || !projectRef) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN and/or SUPABASE_PROJECT_REF.\n' +
      'Create a personal access token at https://supabase.com/dashboard/account/tokens',
  );
  process.exit(1);
}

const confirmationHtml = readFileSync(join(root, 'supabase/templates/confirmation.html'), 'utf8');
const recoveryHtml = readFileSync(join(root, 'supabase/templates/recovery.html'), 'utf8');

for (const [name, html] of [
  ['confirmation', confirmationHtml],
  ['recovery', recoveryHtml],
]) {
  if (!html.includes('{{ .Token }}')) {
    console.error(`${name} template must include {{ .Token }} for 6-digit OTP`);
    process.exit(1);
  }
  if (html.includes('{{ .ConfirmationURL }}')) {
    console.error(
      `${name} template must not use {{ .ConfirmationURL }} — app expects OTP, not a link`,
    );
    process.exit(1);
  }
}

const body = {
  mailer_subjects_confirmation: 'Your CareMate verification code',
  mailer_templates_confirmation_content: confirmationHtml,
  mailer_subjects_recovery: 'Your CareMate password reset code',
  mailer_templates_recovery_content: recoveryHtml,
};

async function patchAuthConfig(payload) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

// Prefer matching local otp_length / otp_expiry; fall back if the API rejects those keys.
let result = await patchAuthConfig({
  ...body,
  mailer_otp_length: 6,
  mailer_otp_exp: 3600,
});

if (!result.ok && (result.status === 400 || result.status === 422)) {
  console.warn(`OTP length/expiry fields rejected (${result.status}); pushing templates only.`);
  result = await patchAuthConfig(body);
}

if (!result.ok) {
  console.error(`Failed to update Auth email config (${result.status}):\n${result.text}`);
  process.exit(1);
}

console.log('Updated hosted Auth email templates:');
console.log('  - Confirm signup → CareMate branding + {{ .Token }}');
console.log('  - Reset password → CareMate branding + {{ .Token }}');
console.log('Send a test reset from the app to verify (expect a 6-digit code, not a link).');
