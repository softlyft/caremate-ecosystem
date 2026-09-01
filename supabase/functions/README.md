# Supabase Edge Functions

Billing checkout, payment webhooks, transactional email (`EMAIL_PROVIDER`), and Expo push.

## Secrets

Set in the linked project (never commit).

### Email — single switch

```bash
# EMAIL_PROVIDER=smtp | ses | resend
supabase secrets set \
  EMAIL_PROVIDER=smtp \
  EMAIL_FROM=hello@getcaremate.com \
  EMAIL_FROM_NAME=CareMate

# SMTP (cPanel / any SMTP) when EMAIL_PROVIDER=smtp
supabase secrets set \
  SMTP_HOST=mail.getcaremate.com \
  SMTP_PORT=465 \
  SMTP_USER=hello@getcaremate.com \
  SMTP_PASS='...' \
  SMTP_SECURE=true

# Amazon SES when EMAIL_PROVIDER=ses
supabase secrets set \
  AWS_ACCESS_KEY_ID=AKIA... \
  AWS_SECRET_ACCESS_KEY=... \
  AWS_REGION=us-east-1

# Resend when EMAIL_PROVIDER=resend
supabase secrets set \
  RESEND_API_KEY=re_...
```

Only the active `EMAIL_PROVIDER` is used; you can keep other credentials set for later. If `EMAIL_PROVIDER` is unset, the mailer auto-detects (resend → ses → smtp). Prefer an explicit switch in production. Legacy `SES_FROM_EMAIL` / `SES_FROM_NAME` still map to From. When nothing is configured, product email is marked `skipped`.

**Full reference (all secrets + accepted values):** [docs/email.md](../docs/email.md)

### Billing + push

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PAYSTACK_SECRET_KEY=sk_test_... \
  EXPO_ACCESS_TOKEN=...
```

`EXPO_ACCESS_TOKEN` is **optional**. When set, Edge Functions send it as `Authorization: Bearer …` to the Expo Push API.

### Store IAP (`verify-store-purchase`)

```bash
supabase secrets set \
  APPLE_IAP_KEY_ID=... \
  APPLE_IAP_ISSUER_ID=... \
  APPLE_IAP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----" \
  APPLE_BUNDLE_ID=com.softlyft.caremate \
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"}' \
  GOOGLE_PLAY_PACKAGE_NAME=com.softlyft.caremate
```

Optional product ID overrides: `IAP_PRODUCT_PERSONAL_MONTHLY`, `IAP_PRODUCT_PERSONAL_YEARLY`, `IAP_PRODUCT_FAMILY_MONTHLY`, `IAP_PRODUCT_FAMILY_YEARLY` (defaults `caremate.premium.personal.monthly` and the matching yearly/family SKUs).

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in hosted functions.

## Email / push functions

| Function | Trigger |
|----------|---------|
| `notify-family-email` | Mobile after family connection request / accept / decline (user JWT). Request → email + Expo push to receiver; accept/decline → Expo push to sender. |
| `notify-message` | Provider portal after org message send, or mobile after direct message (user JWT). Org mode → “New message from {provider}”; `{ mode: 'direct' }` → “New message from {name}”. |
| `notify-provider-connection` | Mobile or portal after patient ↔ provider connection lifecycle (user JWT). Provider-initiated request / accept / decline / cancel / disconnect → Expo push to patient when applicable; patient-initiated request → portal activity only. |
| `notify-provider-document` | Provider portal after uploading a document for a connected patient (user JWT). Creates cloud inbox row + Expo push (“New document” / “{org} shared …”). |
| `notify-medication` | Mobile after medication alert evaluation (user JWT). Dose due / missed / refill → cloud inbox row + Expo push (dedupe keys `med:*`). |
| `create-provider-org-checkout` | Care Portal after owner/admin starts Private Care Team upgrade (user JWT). Paystack NGN only; writes `provider_org_payments`. |
| `send-billing-email` | Portal admin grants (service role) / internal |
| `billing-renewal-reminders` | Daily cron / manual invoke (service role or `CRON_SECRET`) |
| `send-provider-claim-otp` | Provider portal claim (service role) |
| `send-provider-password-reset-otp` | Provider portal forgot-password (service role) |
| `send-community-join-otp` | Community portal Patient ID verify (service role) |
| `delete-account` | Mobile Settings → Delete account (user JWT → `auth.admin.deleteUser`) |

Shared helpers: `_shared/mailer.ts`, `_shared/email.ts`, `_shared/push.ts`, `_shared/email-templates/`. Legacy `_shared/ses.ts` re-exports the mailer.

## Auth emails (signup / password reset)

Mobile confirmation and recovery use **Supabase Auth** templates (`supabase/templates/*.html`) with a 6-digit `{{ .Token }}` — not the Edge mailer. Hosted projects must:

1. Sync templates: `supabase config push --project-ref <ref> --yes` (or `npm run supabase:sync-auth-emails`).
2. Configure **Auth → SMTP** in the Dashboard with the **same** mailbox/SMTP you use for product mail (e.g. cPanel `hello@getcaremate.com`). Without custom SMTP, Auth uses Supabase’s built-in sender.

| Function | Trigger |
|----------|---------|
| `create-checkout-handoff` | Website/community before opening payment URL (user JWT) — stores session tokens server-side, returns single-use code |
| `exchange-checkout-handoff` | Payment gateway hash handoff (anon) — returns tokens once, marks code used |

### Account deletion

`delete-account` requires the caller's `Authorization` bearer JWT. It best-effort cancels active Stripe/Paystack subscriptions, then deletes `auth.users` (cloud rows cascade). The mobile client wipes that user's local SQLite rows + mini-app snapshots and returns to guest.

Full matrix (cascade tables, local wipe, QA checklist, admin disable vs delete): [caremate-mobile/docs/account-deletion.md](../../caremate-mobile/docs/account-deletion.md).

## Local serve

```bash
supabase functions serve create-checkout --env-file ./supabase/.env.local
```
