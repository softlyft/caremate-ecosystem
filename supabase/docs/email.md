# Transactional email configuration

[← Back to index](./README.md)

CareMate product email (Edge Functions) uses a single pluggable mailer:

`supabase/functions/_shared/mailer.ts`

Auth signup / password-reset OTPs use **Supabase Auth SMTP** (Dashboard), not this mailer — but you should use the **same mailbox** for branding consistency.

---

## Switch

| Secret | Required | Accepted values | Default |
|--------|----------|-----------------|--------|
| `EMAIL_PROVIDER` | Recommended in prod | `smtp` · `ses` · `resend` · `auto` (or unset) | Unset = **auto-detect** |

**Auto-detect order** (when `EMAIL_PROVIDER` is unset or `auto`):

1. `resend` if `RESEND_API_KEY` is set  
2. else `ses` if AWS SES credentials are set  
3. else `smtp` if SMTP credentials are set  
4. else email is **not configured** → sends are marked `skipped`

Only the active provider is used. You may keep other providers’ secrets set for later and flip `EMAIL_PROVIDER` alone.

Invalid values (anything other than `smtp` / `ses` / `resend` / `auto` / empty) → not configured (`skipped`).

---

## Shared From address

| Secret | Required | Accepted values | Default |
|--------|----------|-----------------|--------|
| `EMAIL_FROM` | No | Any email you are allowed to send from | `hello@getcaremate.com` |
| `EMAIL_FROM_NAME` | No | Display name string | `CareMate` |

**Legacy aliases** (still supported):

| Legacy | Maps to |
|--------|---------|
| `SES_FROM_EMAIL` | `EMAIL_FROM` |
| `SES_FROM_NAME` | `EMAIL_FROM_NAME` |

Resolved From header: `CareMate <hello@getcaremate.com>` (name omitted if empty).

---

## Provider: `smtp` (cPanel / any SMTP)

| Secret | Required | Accepted values | Notes |
|--------|----------|-----------------|--------|
| `SMTP_HOST` | Yes | Hostname, e.g. `mail.getcaremate.com` | |
| `SMTP_PORT` | No | Integer | Default `465` |
| `SMTP_USER` | Yes | Usually full mailbox, e.g. `hello@getcaremate.com` | |
| `SMTP_PASS` | Yes | Mailbox password | |
| `SMTP_SECURE` | No | `true` · `1` · `false` · `0` | If unset: **secure when port is 465**, otherwise STARTTLS-style |

Example (cPanel MVP):

```bash
supabase secrets set \
  EMAIL_PROVIDER=smtp \
  EMAIL_FROM=hello@getcaremate.com \
  EMAIL_FROM_NAME=CareMate \
  SMTP_HOST=mail.getcaremate.com \
  SMTP_PORT=465 \
  SMTP_USER=hello@getcaremate.com \
  SMTP_PASS='your-mailbox-password' \
  SMTP_SECURE=true
```

Typical ports: `465` (SSL/TLS) or `587` (STARTTLS → often `SMTP_SECURE=false`).

---

## Provider: `ses` (Amazon SES)

| Secret | Required | Accepted values | Notes |
|--------|----------|-----------------|--------|
| `AWS_ACCESS_KEY_ID` | Yes | IAM access key | Needs `ses:SendEmail` |
| `AWS_SECRET_ACCESS_KEY` | Yes | IAM secret | |
| `AWS_REGION` | Yes | e.g. `us-east-1`, `eu-west-1` | Must match the SES region |

`EMAIL_FROM` / verified domain must be allowed in SES (sandbox vs production).

```bash
supabase secrets set \
  EMAIL_PROVIDER=ses \
  EMAIL_FROM=hello@getcaremate.com \
  EMAIL_FROM_NAME=CareMate \
  AWS_ACCESS_KEY_ID=AKIA... \
  AWS_SECRET_ACCESS_KEY=... \
  AWS_REGION=us-east-1
```

---

## Provider: `resend`

| Secret | Required | Accepted values | Notes |
|--------|----------|-----------------|--------|
| `RESEND_API_KEY` | Yes | `re_…` API key | Domain/from must be verified in Resend |

```bash
supabase secrets set \
  EMAIL_PROVIDER=resend \
  EMAIL_FROM=hello@getcaremate.com \
  EMAIL_FROM_NAME=CareMate \
  RESEND_API_KEY=re_...
```

---

## Per environment

Set secrets on **each** linked Supabase project (dev and prod):

```bash
npm run supabase:link:dev   # or :prod
supabase secrets set EMAIL_PROVIDER=smtp ...
# Redeploy functions after secret or mailer code changes
npm run supabase:functions:deploy
```

CI deploys function **code** only; it does not copy secrets between projects.

---

## Behaviour when not configured

- `isEmailConfigured()` → `false`
- OTP Edge Functions (`send-*-otp`) return **503** with skipped reason  
- Transactional mail via `sendTransactionalEmail` records delivery status **`skipped`** (callers/webhooks can still succeed)

---

## Auth emails (separate from Edge mailer)

| Setting | Where | Values |
|---------|--------|--------|
| Custom SMTP | Dashboard → **Authentication → SMTP** | Same host/user/pass as product SMTP when using cPanel |
| Templates | `supabase/templates/*.html` | Sync with `supabase config push` / `npm run supabase:sync-auth-emails` |

Auth does **not** read `EMAIL_PROVIDER`. Point Auth SMTP at the same mailbox for a consistent From address.

---

## What uses the Edge mailer

| Surface | Path |
|---------|------|
| Family / billing / message product email | `_shared/email.ts` → `sendEmail()` |
| Provider claim OTP | `send-provider-claim-otp` |
| Provider password-reset OTP | `send-provider-password-reset-otp` |
| Community join OTP | `send-community-join-otp` |

Delivery rows store the active provider id (`smtp` / `ses` / `resend`) on `notification_deliveries.provider` when sent through `sendTransactionalEmail`.

---

## Quick reference — all secrets

| Secret | Used when |
|--------|-----------|
| `EMAIL_PROVIDER` | Always (switch) |
| `EMAIL_FROM` | Always |
| `EMAIL_FROM_NAME` | Always |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | `smtp` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | `ses` |
| `RESEND_API_KEY` | `resend` |
| `SES_FROM_EMAIL` / `SES_FROM_NAME` | Legacy From aliases |

See also: [Edge Functions README](../functions/README.md) · [Operations](./operations.md)
