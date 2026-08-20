# Operations

## Environments

| Git / local | Supabase project | Ref | Link script |
|-------------|------------------|-----|-------------|
| Local machine + branch **`main`** | **caremate-dev** | `eybakmhqtotoywwgwgjy` | `npm run supabase:link:dev` |
| Branch **`prod`** | **caremate prod** | `aokorersszvediuatagp` | `npm run supabase:link:prod` |

Schema files are shared (`supabase/migrations/`). Each hosted project has its **own** migration history — always link the project you intend to change before `db push`.

## CLI Workflow (local)

Run from the monorepo root:

```bash
# Development (default)
npm run supabase:link:dev
npm run supabase:migration:new -- describe_change
npm run supabase:migration:list
npm run supabase:db:push
npm run db:types

# Production (only when deliberately migrating prod)
npm run supabase:link:prod
npm run supabase:db:push
```

`npm run supabase:link` is an alias of `supabase:link:dev`.

## CI — migrations + Edge Functions per env

Workflow: [`.github/workflows/supabase-migrate.yml`](../../.github/workflows/supabase-migrate.yml) (**Supabase Deploy**)

| Trigger | Target | Migrations | Functions |
|---------|--------|------------|-----------|
| Push to **`main`** (supabase paths) | development → caremate-dev | apply (if migrations changed) | deploy all (if `functions/` changed) |
| Push to **`prod`** (supabase paths) | production → caremate prod | apply (if migrations changed) | deploy all (if `functions/` changed) |
| PR into `main` / `prod` | matching base branch project | dry-run | skipped |
| **Actions → Supabase Deploy** | choose development or production | apply / dry-run / skip | deploy / skip |

Function deploy uses `supabase functions deploy <name> --use-api` for every folder under `supabase/functions/` that has `index.ts` (skips `_shared`).

### GitHub Environment secrets (each of `development` and `production`)

| Secret | Notes |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) — same token can be used on both envs if it can access both projects |
| `SUPABASE_DB_PASSWORD` | **Project-specific** database password (Dashboard → Project Settings → Database) |

Do **not** put the prod DB password on the `development` environment (or vice versa).

Edge Function **runtime** secrets (`EMAIL_PROVIDER` / SMTP·SES·Resend, `STRIPE_*`, `PAYSTACK_*`, etc.) are still set per project with `supabase secrets set` after linking — CI deploys code only; it does not copy secrets between envs. Email settings reference: [email.md](./email.md).

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

Deploy **all** functions to the linked project:

```bash
npm run supabase:functions:deploy
# or after linking a specific env:
npm run supabase:link:dev && npm run supabase:functions:deploy
npm run supabase:link:prod && npm run supabase:functions:deploy
```

Or one function:

```bash
supabase functions deploy create-checkout --use-api
```

CI deploys every function (except `_shared`) on push when `supabase/functions/**` changes — see [CI above](#ci--migrations--edge-functions-per-env).

Set **per-project** secrets with (after `supabase:link:dev` or `:prod`):

```bash
# Email switch: smtp | ses | resend — see supabase/functions/README.md
supabase secrets set \
  EMAIL_PROVIDER=smtp \
  EMAIL_FROM=hello@getcaremate.com \
  EMAIL_FROM_NAME=CareMate \
  SMTP_HOST=mail.getcaremate.com \
  SMTP_PORT=465 \
  SMTP_USER=hello@getcaremate.com \
  SMTP_PASS=... \
  STRIPE_SECRET_KEY=... \
  STRIPE_WEBHOOK_SECRET=... \
  PAYSTACK_SECRET_KEY=... \
  APPLE_IAP_KEY_ID=... \
  APPLE_IAP_ISSUER_ID=... \
  APPLE_IAP_PRIVATE_KEY=... \
  APPLE_BUNDLE_ID=com.softlyft.caremate \
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=... \
  GOOGLE_PLAY_PACKAGE_NAME=com.softlyft.caremate
```

Prod and dev each need their own secret values (live vs test keys as appropriate).
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
