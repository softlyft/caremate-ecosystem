# CareMate Ecosystem

Monorepo for the CareMate product surface: the offline-first mobile app, the admin portal, the provider ingestion service, the shared Supabase backend, and the shared database types package.

```text
caremate-ecosystem/
├── caremate-mobile/                Expo mobile app (SQLite + sync + mini-apps)
├── caremate-admin-portal/          Next.js SoftLyft admin portal
├── caremate-provider-portal/       Next.js provider patient-engagement portal
├── caremate-community-portal/      Next.js contributor community portal
├── caremate-payment-gateway/       Vite hosted checkout (Paystack / Stripe)
├── caremate-provider-ingestion/    FastAPI Excel/XLSX → Supabase provider ingest
├── caremate-website/               Marketing site (welcome, guides, legal)
├── supabase/                       Cloud schema, RLS, RPCs, Edge Functions
└── packages/db-types/              Shared TypeScript database contracts
```

## Service Docs

Each service keeps its own README plus a local `docs/` set.

| Service | Purpose | Docs |
|---------|---------|------|
| `caremate-mobile/` | Mobile experience for patients and families | `caremate-mobile/docs/README.md` |
| `caremate-admin-portal/` | SoftLyft staff admin (catalogs, users, billing, ads) | `caremate-admin-portal/docs/README.md` |
| `caremate-provider-portal/` | Provider org patient engagement (connections, docs, messages) | `caremate-provider-portal/docs/README.md` |
| `caremate-community-portal/` | Contributor community (chapters, events, recognition) | `caremate-community-portal/docs/README.md` |
| `caremate-payment-gateway/` | Hosted Premium checkout (Paystack NGN / Stripe USD) | `caremate-payment-gateway/README.md` |
| `caremate-provider-ingestion/` | Provider resource ingest and projection rebuilds | `caremate-provider-ingestion/docs/README.md` |
| `caremate-website/` | Marketing + patient / CCN / provider guides + privacy/terms | `caremate-website/README.md` |
| `supabase/` | Shared cloud schema, RLS, RPCs, and Edge Functions | `supabase/docs/README.md` |
| `packages/db-types/` | Shared generated and aliased database types | `packages/db-types/docs/README.md` |
| Amplify hosting | Website, payment, admin, provider, and community portals | [`docs/amplify-hosting.md`](./docs/amplify-hosting.md) |
| Security (non-mobile) | Edge, payment gateway, portals — threat models & controls | [`docs/security.md`](./docs/security.md) |

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
| `npm run portal:dev` | Starts the Next.js SoftLyft admin portal |
| `npm run provider-portal:dev` | Starts the provider engagement portal on `:4000` |
| `npm run community-portal:dev` | Starts the contributor community portal on `:4001` |
| `npm run payment:dev` | Starts the hosted checkout app on `:5174` |
| `npm run ingest:dev` | Starts the caremate-provider-ingestion FastAPI service on `:8090` |
| `npm run supabase:link` | Links the local repo to the hosted Supabase project |
| `npm run supabase:migration:new -- name_here` | Creates a new SQL migration |
| `npm run supabase:migration:list` | Lists local/remote migration state |
| `npm run supabase:db:push` | Pushes local migrations to the linked project |
| `npm run db:types` | Regenerates `packages/db-types/src/database.ts` |

## Responsibilities

| Path | Owns |
|------|------|
| `supabase/` | Shared cloud schema, RLS, RPCs, Storage, Edge Functions |
| `caremate-mobile/src/database/` | Device SQLite schema and runtime migrations for the mobile app |
| `packages/db-types/` | Shared TS contracts used by mobile and portal |
| `caremate-mobile/` | Patient-facing product UX and offline-first data flow |
| `caremate-admin-portal/` | Staff operations for content, users, providers, billing |
| `caremate-community-portal/` | Contributor Community Network portal (Patient ID join, chapters) |
| `caremate-payment-gateway/` | Browser checkout handoff for Paystack / Stripe |
| `caremate-provider-ingestion/` | Provider resource ingest and `providers` projection rebuilds |
| `caremate-website/` | Public marketing, patient / CCN / provider guides, legal pages |

## Prerequisites

- Node 20+
- Python 3.11+ for `caremate-provider-ingestion`
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Linked Supabase project (development): `caremate-dev` / `eybakmhqtotoywwgwgjy`
  - CLI: `npm run supabase:link` targets this ref
  - **Not production** — create and wire a separate prod project before store / prod Amplify hosts go live against real users

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
   - `caremate-mobile/src/database/schema.ts`
   - the relevant mobile repositories / sync handlers
   - `caremate-mobile/docs/supabase-alignment.md`
   - `packages/db-types` via `npm run db:types`
4. Portal-only tables such as `admin_audit_events` stay cloud-only and do not need a SQLite mirror.

## Billing Overview

Premium billing spans multiple services:

- Cloud tables: `subscription_prices`, `payments` (transactions), `subscriptions` (entitlements)
- Mobile currency: Nigeria → NGN/Paystack; otherwise USD/Stripe (`caremate-mobile/src/domains/billing/currency-by-country.ts`)
- New checkout: opens hosted `caremate-payment-gateway/` app → `create-checkout` (pending payment)
- Standard → Family upgrade: `quote-upgrade` / `create-upgrade` (credit + new period; gateway URL opened directly; `caremate-payment-gateway/` used for success/cancel return)
- After charge success: webhook or `verify-checkout` marks payment succeeded and creates/renews subscription (or finalizes upgrade)
- Portal: price catalog, transactions, subscribers, admin grants, admin Family upgrade, audit logs
- Edge Functions:
  - `create-checkout`
  - `quote-upgrade`
  - `create-upgrade`
  - `verify-checkout`
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

### Mobile (`caremate-mobile/`)

```bash
npm run mobile:start
# or
npm run start -w caremate-mobile
```

Native debug builds:

```bash
npm run android -w caremate-mobile
npm run ios -w caremate-mobile
```

### Admin Portal (`caremate-admin-portal/`)

```bash
cp caremate-admin-portal/.env.example caremate-admin-portal/.env.local
npm run supabase:db:push
npm run bootstrap:admin -w caremate-admin-portal -- you@example.com admin
npm run portal:dev
```

### Payment (`caremate-payment-gateway/`)

```bash
cp caremate-payment-gateway/.env.example caremate-payment-gateway/.env
# Same Supabase URL + anon key as the mobile app
npm run payment:dev
```

Set `EXPO_PUBLIC_PAYMENT_URL` in `caremate-mobile/.env` (local default: `http://localhost:5174`).

### Provider Ingestion (`caremate-provider-ingestion/`)

```bash
cp caremate-provider-ingestion/.env.example caremate-provider-ingestion/.env
npm run ingest:dev
```

Portal provider upload expects matching values in `caremate-admin-portal/.env.example`:

- `PROVIDER_INGEST_URL`
- `PROVIDER_INGEST_API_KEY`

## Seeds and Fixtures

- `supabase/seed.sql` is intentionally a safe placeholder.
- Catalog bootstrap lives in the portal scripts:
  - `npm run seed:articles -w caremate-admin-portal`
  - `npm run seed:tips -w caremate-admin-portal`
  - `npm run seed:catalogs -w caremate-admin-portal`
- Provider sample workbooks live under `caremate-provider-ingestion/samples/`.

## CI

Workflows live under `.github/workflows/`:

- `ci.yml` — lint, typecheck, test gates for active app surfaces
- `android-play.yml` — signed Android AAB + Play upload
- `ios-testflight.yml` — signed iOS IPA + TestFlight upload
- `mobile-cd.yml` — sideload Android APK artifact after CI

## Adding a Future App

1. Add `caremate-<name>/` at repo root and list it in root `package.json` workspaces.
2. Reuse `@caremate/db-types` and the same shared Supabase project where appropriate.
3. Put all new cloud schema only in `supabase/migrations/`.
4. Add a README and a local `docs/` folder for the new service.
