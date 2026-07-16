# CareMate Ecosystem

Monorepo for the CareMate product surface: the offline-first mobile app, the admin portal, the provider ingestion service, the shared Supabase backend, and the shared database types package.

```text
caremate-ecosystem/
├── caremate/            Expo mobile app (SQLite + sync + mini-apps)
├── caremate-portal/     Next.js admin portal
├── provider-ingestion/  FastAPI Excel/XLSX → Supabase provider ingest
├── supabase/            Cloud schema, RLS, RPCs, Edge Functions
└── packages/db-types/   Shared TypeScript database contracts
```

## Service Docs

Each service keeps its own README plus a local `docs/` set.

| Service | Purpose | Docs |
|---------|---------|------|
| `caremate/` | Mobile experience for patients and families | `caremate/docs/README.md` |
| `caremate-portal/` | Staff/admin portal for catalogs, users, billing, providers | `caremate-portal/docs/README.md` |
| `provider-ingestion/` | Provider resource ingest and projection rebuilds | `provider-ingestion/docs/README.md` |
| `supabase/` | Shared cloud schema, RLS, RPCs, and Edge Functions | `supabase/docs/README.md` |
| `packages/db-types/` | Shared generated and aliased database types | `packages/db-types/docs/README.md` |

## Root Workflows

Install dependencies once from the repo root:

```bash
npm install
```

Useful root scripts:

| Script | What it does |
|--------|---------------|
| `npm run lint` | Runs mobile + portal lint |
| `npm run typecheck` | Runs mobile + portal TypeScript checks |
| `npm run test` | Runs mobile Jest + portal unit tests |
| `npm run format` | Formats the mobile app with Prettier (`--write`) |
| `npm run mobile:start` | Starts the Expo mobile app |
| `npm run portal:dev` | Starts the Next.js portal |
| `npm run ingest:dev` | Starts the provider-ingestion FastAPI service on `:8090` |
| `npm run supabase:link` | Links the local repo to the hosted Supabase project |
| `npm run supabase:migration:new -- name_here` | Creates a new SQL migration |
| `npm run supabase:migration:list` | Lists local/remote migration state |
| `npm run supabase:db:push` | Pushes local migrations to the linked project |
| `npm run db:types` | Regenerates `packages/db-types/src/database.ts` |

## Responsibilities

| Path | Owns |
|------|------|
| `supabase/` | Shared cloud schema, RLS, RPCs, Storage, Edge Functions |
| `caremate/src/database/` | Device SQLite schema and runtime migrations for the mobile app |
| `packages/db-types/` | Shared TS contracts used by mobile and portal |
| `caremate/` | Patient-facing product UX and offline-first data flow |
| `caremate-portal/` | Staff operations for content, users, providers, billing |
| `provider-ingestion/` | Provider resource ingest and `providers` projection rebuilds |

## Prerequisites

- Node 20+
- Python 3.11+ for `provider-ingestion`
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Linked Supabase project ref: `eybakmhqtotoywwgwgjy`

## Shared Database Workflow

Run from the repo root:

```bash
npm run supabase:link
npm run supabase:migration:new -- add_something
npm run supabase:db:push
npm run db:types
```

Rules:

1. All cloud schema changes live in `supabase/migrations/`.
2. Do not add a second `supabase/migrations` folder inside an app.
3. If a mobile-synced table changes, update the same change set in:
   - `supabase/migrations/*`
   - `caremate/src/database/schema.ts`
   - the relevant mobile repositories / sync handlers
   - `caremate/docs/supabase-alignment.md`
   - `packages/db-types` via `npm run db:types`
4. Portal-only tables such as `admin_audit_events` stay cloud-only and do not need a SQLite mirror.

## Billing Overview

Premium billing spans multiple services:

- Cloud tables: `subscription_prices`, `subscriptions`
- Mobile: hosted checkout via Supabase Edge Function `create-checkout`
- Portal: admin management for prices and subscriber views
- Edge Functions:
  - `billing-webhook-stripe`
  - `billing-webhook-paystack`
- Secrets live on Supabase Edge Functions, not in the portal runtime env

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PAYSTACK_SECRET_KEY=sk_...
```

Mobile deep links:

- `caremate://billing/success`
- `caremate://billing/cancel`

## Local Development

### Mobile (`caremate/`)

```bash
npm run mobile:start
# or
npm run start -w caremate
```

Native debug builds:

```bash
npm run android -w caremate
npm run ios -w caremate
```

### Admin Portal (`caremate-portal/`)

```bash
cp caremate-portal/.env.example caremate-portal/.env.local
npm run supabase:db:push
npm run bootstrap:admin -w caremate-portal -- you@example.com admin
npm run portal:dev
```

### Provider Ingestion (`provider-ingestion/`)

```bash
cp provider-ingestion/.env.example provider-ingestion/.env
npm run ingest:dev
```

Portal provider upload expects matching values in `caremate-portal/.env.example`:

- `PROVIDER_INGEST_URL`
- `PROVIDER_INGEST_API_KEY`

## Seeds and Fixtures

- `supabase/seed.sql` is intentionally a safe placeholder.
- Catalog bootstrap lives in the portal scripts:
  - `npm run seed:articles -w caremate-portal`
  - `npm run seed:tips -w caremate-portal`
  - `npm run seed:catalogs -w caremate-portal`
- Provider sample workbooks live under `provider-ingestion/samples/`.

## CI

Workflows live under `.github/workflows/`:

- `ci.yml` — lint, typecheck, test gates for active app surfaces
- `eas-test-release.yml` — mobile EAS test/release automation

## Adding a Future App

1. Add `caremate-<name>/` at repo root and list it in root `package.json` workspaces.
2. Reuse `@caremate/db-types` and the same shared Supabase project where appropriate.
3. Put all new cloud schema only in `supabase/migrations/`.
4. Add a README and a local `docs/` folder for the new service.
