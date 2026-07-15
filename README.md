# CareMate Ecosystem (monorepo)

Single GitHub repo for CareMate apps that share one Supabase project.

```
caremate-ecosystem/
  supabase/              # Postgres migrations, RLS, RPCs, Storage (source of truth)
  packages/db-types/     # Shared generated/handwritten TS types
  caremate/              # Expo mobile app (SQLite + sync)
  caremate-portal/       # Next.js admin portal
```

## Workspaces

Install once from the **repo root** (`npm workspaces`):

```bash
npm install
```

Root scripts:

| Script | What it runs |
|--------|----------------|
| `npm run lint` | Mobile + portal lint |
| `npm run typecheck` | Mobile + portal `tsc` |
| `npm run test` | Mobile Jest + portal RBAC unit tests |
| `npm run format` | Mobile Prettier check |
| `npm run portal:dev` / `mobile:start` | App servers via workspace |

## Responsibilities

| Path | Owns |
|------|------|
| `supabase/` | Cloud schema only — Auth-adjacent tables, catalogs, RLS, Storage |
| `caremate/src/database/` | Device SQLite (Drizzle). Must stay **aligned** with shared cloud tables via sync mappers |
| `packages/db-types/` | TypeScript `Database` types consumed by mobile + portal |
| Apps | UI + feature logic; never fork migration history |

## Prerequisites

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Linked project ref: `eybakmhqtotoywwgwgjy`

## Shared database

From **this repo root**:

```bash
npm run supabase:link          # once per machine
npm run supabase:migration:new -- add_something
npm run supabase:db:push
npm run db:types               # refresh packages/db-types after schema changes
```

Do **not** add a second `supabase/migrations` folder under an app.

When you change a table that mobile syncs, update in the same change set:

1. `supabase/migrations/*`
2. `caremate/src/database/schema.ts` + repository/sync handlers
3. `caremate/docs/supabase-alignment.md`
4. `npm run db:types` (shared types for both apps)

Portal-only tables (e.g. `admin_audit_events`) stay cloud-only — no SQLite mirror.

## Billing (Premium)

- Cloud tables: `subscription_prices`, `subscriptions` (see `supabase/migrations/20260714180000_billing_subscriptions.sql`)
- Portal **Billing** (admin): configure Personal/Family × monthly/yearly × NGN/USD; list subscribers
- Mobile: hosted **Paystack** (NGN) / **Stripe** (USD) checkout via Edge Function `create-checkout`
- Webhooks: `billing-webhook-paystack`, `billing-webhook-stripe`
- Secrets are set on **Supabase Edge Functions** (not in portal `.env`):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... PAYSTACK_SECRET_KEY=sk_...
```

Deep links: `caremate://billing/success`, `caremate://billing/cancel`

Local `supabase db reset` loads `supabase/seed.sql` (placeholder). Catalog fixtures: `npm run seed:catalogs -w caremate-portal`.

## Apps

### Mobile (`caremate/`)

```bash
npm install                    # from repo root
npm run mobile:start
# or: npm run start -w caremate
```

Proxies for DB ops (still run migrations from root):

```bash
npm run supabase:db:push -w caremate   # → repo root
```

### Admin portal (`caremate-portal/`)

```bash
cp caremate-portal/.env.example caremate-portal/.env.local   # fill keys
npm run supabase:db:push
npm run bootstrap:admin -w caremate-portal -- you@example.com admin
npm run portal:dev
```

## CI

Workflows live under `.github/workflows/` (repo root):

- `ci.yml` — mobile + portal quality gates
- `eas-test-release.yml` — EAS test builds (mobile)

## Former remotes

Nested app remotes were parked as `.git.bak-pre-monorepo` under each app while consolidating into this monorepo.

- Mobile previously: `https://github.com/softlyft/caremate.git`

After you create / point a new monorepo remote:

```bash
git remote add origin <new-ecosystem-repo-url>
git add .
git commit -m "chore: adopt caremate-ecosystem monorepo"
git push -u origin main
```

Then delete `**/.git.bak-pre-monorepo` once you confirm history is where you want it.

## Adding a future app

1. Add `caremate-<name>/` at repo root and list it in root `package.json` `workspaces`.
2. Consume `@caremate/db-types` and the same Supabase project env vars.
3. Put any new cloud schema only in `supabase/migrations/`.
