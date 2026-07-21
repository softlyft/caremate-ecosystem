# Shared Supabase schema

Single source of truth for the CareMate cloud database (Postgres, RLS, RPCs, Storage).

All apps in this monorepo (`caremate-mobile`, `caremate-admin-portal`, future packages) target the same project.

## Docs

For service-specific documentation, start here:

- [Supabase docs index](./docs/README.md)
- [Schema overview](./docs/schema-overview.md)
- [Auth and RLS](./docs/auth-and-rls.md)
- [RPCs and functions](./docs/rpcs-and-functions.md)
- [Operations](./docs/operations.md)

## Commands (from repo root)

```bash
npm run supabase:link
npm run supabase:migration:new -- describe_change
npm run supabase:migration:list
npm run supabase:db:push
npm run db:types
```

## Seed

`config.toml` loads `./seed.sql` on `supabase db reset`. That file is a safe no-op placeholder; catalog seeds run from the portal (`npm run seed:catalogs -w caremate-admin-portal`).

## Edge Functions (billing)

| Function | JWT | Purpose |
|----------|-----|---------|
| `create-checkout` | required | Create pending payment + Paystack/Stripe hosted checkout |
| `quote-upgrade` | required | Quote Standard → Family credit and amount due |
| `create-upgrade` | required | Pending upgrade payment (or zero-charge activate) |
| `verify-checkout` | required | Confirm charge and activate subscription (app return fallback) |
| `billing-webhook-stripe` | off | Stripe payment + subscription lifecycle |
| `billing-webhook-paystack` | off | Paystack charge success / failure |

Deploy:

```bash
supabase functions deploy create-checkout
supabase functions deploy quote-upgrade
supabase functions deploy create-upgrade
supabase functions deploy verify-checkout
supabase functions deploy billing-webhook-stripe
supabase functions deploy billing-webhook-paystack
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... PAYSTACK_SECRET_KEY=...
```

Point Stripe webhook to `https://<project-ref>.supabase.co/functions/v1/billing-webhook-stripe`  
Point Paystack webhook to `https://<project-ref>.supabase.co/functions/v1/billing-webhook-paystack`

## Rules

1. **Only** add SQL migrations here — never under an app folder.
2. Tables synced by the mobile app require a matching update to `caremate-mobile/src/database/schema.ts` + sync handlers + `caremate-mobile/docs/supabase-alignment.md`.
3. Admin-/portal-only tables do not need a SQLite mirror.
4. After schema changes, regenerate `packages/db-types` with `npm run db:types`.
