# Supabase Edge Functions

Billing checkout, payment webhooks, transactional email (Amazon SES), and Expo push.

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
  SES_FROM_EMAIL=hello@getcaremate.com \
  SES_FROM_NAME=CareMate \
  EXPO_ACCESS_TOKEN=...
```

`SES_FROM_EMAIL` must be a verified SES identity (domain or address). CareMate transactional mail sends as **`hello@getcaremate.com`**. When SES env vars are missing, product email deliveries are marked `skipped` so local/dev webhooks still succeed.

`EXPO_ACCESS_TOKEN` is **optional**. When set, Edge Functions send it as `Authorization: Bearer …` to the Expo Push API. Without it, Expo still accepts push sends for most projects (rate limits may be lower).

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in hosted functions.

## Email / push functions

| Function | Trigger |
|----------|---------|
| `notify-family-email` | Mobile after family connection request / accept / decline (user JWT). Request → SES + Expo push to receiver; accept/decline → Expo push to sender. |
| `send-billing-email` | Portal admin grants (service role) / internal |
| `billing-renewal-reminders` | Daily cron / manual invoke (service role) |
| `delete-account` | Mobile Settings → Delete account (user JWT → `auth.admin.deleteUser`) |

Shared helpers: `_shared/ses.ts`, `_shared/email.ts`, `_shared/push.ts`, `_shared/email-templates/`.

| Function | Trigger |
|----------|---------|
| `create-checkout-handoff` | Mobile before opening payment URL (user JWT) — stores session tokens server-side, returns single-use code |
| `exchange-checkout-handoff` | Payment gateway hash handoff (anon) — returns tokens once, marks code used |

### Account deletion

`delete-account` requires the caller's `Authorization` bearer JWT. It best-effort cancels active Stripe/Paystack subscriptions, then deletes `auth.users` (cloud rows cascade). The mobile client wipes that user's local SQLite rows + mini-app snapshots and returns to guest.

## Local serve

```bash
supabase functions serve create-checkout --env-file ./supabase/.env.local
```
