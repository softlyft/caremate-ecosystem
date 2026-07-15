# Supabase Edge Functions

Billing checkout and payment webhooks.

## Secrets

Set in the linked project (never commit):

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PAYSTACK_SECRET_KEY=sk_test_...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in hosted functions.

## Local serve

```bash
supabase functions serve create-checkout --env-file ./supabase/.env.local
```
