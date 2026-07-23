# Operations

## CLI Workflow

Run from the monorepo root:

```bash
npm run supabase:link
npm run supabase:migration:new -- describe_change
npm run supabase:migration:list
npm run supabase:db:push
npm run db:types
```

`npm run supabase:link` targets **`caremate-dev`** (`eybakmhqtotoywwgwgjy`) — the development project. Link a separate production project before applying migrations or secrets meant for prod.

## Local Config

`supabase/config.toml` currently defines:

- API on `54321`
- Postgres on `54322`
- Studio on `54323`
- Inbucket on `54324`
- analytics on `54327`
- Edge runtime inspector on `8083`
- Postgres major version `17`

## Seeds

`db.seed.sql_paths = ["./seed.sql"]`

Current behavior:

- `seed.sql` is intentionally a placeholder
- catalog/bootstrap content is loaded through portal seed scripts instead

## Edge Function Operations

Deploy functions with:

```bash
supabase functions deploy create-checkout
supabase functions deploy quote-upgrade
supabase functions deploy create-upgrade
supabase functions deploy verify-checkout
supabase functions deploy billing-webhook-stripe
supabase functions deploy billing-webhook-paystack
```

Set secrets with:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=... \
  STRIPE_WEBHOOK_SECRET=... \
  PAYSTACK_SECRET_KEY=...
```

## Change Management

When changing cloud tables that mobile syncs:

1. add or update the SQL migration
2. update mobile SQLite schema/migrations
3. update sync handlers or repositories as needed
4. refresh `packages/db-types`
5. update service docs

## Current Constraints

- Local SQL seed content is intentionally minimal
- Some operational behavior depends on external providers such as Stripe and Paystack
- Provider ingest writes depend on the separate `caremate-provider-ingestion` service using a service-role key
