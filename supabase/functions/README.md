# Supabase Edge Functions

Billing checkout, payment webhooks, and transactional email (Amazon SES).

## Secrets

Set in the linked project (never commit):

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PAYSTACK_SECRET_KEY=sk_test_... \
  AWS_ACCESS_KEY_ID=AKIA... \
  AWS_SECRET_ACCESS_KEY=... \
  AWS_REGION=us-east-1 \
  SES_FROM_EMAIL=noreply@yourdomain.com \
  SES_FROM_NAME=CareMate
```

`SES_FROM_EMAIL` must be a verified SES identity (domain or address). When SES env vars are missing, product email deliveries are marked `skipped` so local/dev webhooks still succeed.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in hosted functions.

## Email functions

| Function | Trigger |
|----------|---------|
| `notify-family-email` | Mobile after family connection request (user JWT) |
| `send-billing-email` | Portal admin grants (service role) / internal |
| `billing-renewal-reminders` | Daily cron / manual invoke (service role) |
| `delete-account` | Mobile Settings → Delete account (user JWT → `auth.admin.deleteUser`) |

Shared helpers: `_shared/ses.ts`, `_shared/email.ts`, `_shared/email-templates/`.

### Account deletion

`delete-account` requires the caller's `Authorization` bearer JWT. It best-effort cancels active Stripe/Paystack subscriptions, then deletes `auth.users` (cloud rows cascade). The mobile client wipes that user's local SQLite rows + mini-app snapshots and returns to guest.

## Local serve

```bash
supabase functions serve create-checkout --env-file ./supabase/.env.local
```
