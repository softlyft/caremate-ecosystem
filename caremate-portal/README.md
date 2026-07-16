# CareMate Admin Portal

Next.js admin console for CareMate. Lives in the **caremate-ecosystem** monorepo and uses the shared Supabase project.

See the [ecosystem README](../README.md) for folder layout and migration ownership.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- `@supabase/ssr` + service-role for Auth Admin ops
- Shared types: `@caremate/db-types`
- TanStack Query, Zustand, React Hook Form, Zod

## Setup

1. From **repo root**, apply cloud migrations:

```bash
cd ..
npm run supabase:link    # once
npm run supabase:db:push
```

2. Portal env:

```bash
cp .env.example .env.local
```

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same project as mobile |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |

3. Bootstrap staff role:

```bash
npm run bootstrap:admin -- you@example.com admin
```

4. Install & run:

```bash
npm install
npm run dev
```

## Optional catalog seed

```bash
# Learn articles only (from caremate-portal/data/learn.json)
npm run seed:articles

# Health tips only (from caremate-portal/data/health-tips.json)
npm run seed:tips

# Articles + providers + health tips
npm run seed:catalogs
```

Loads portal `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Edit content in the portal afterward; re-run seed only to bootstrap empty projects.

## Modules

| Area | Capabilities |
|------|----------------|
| **Users** | List/search, disable/enable, password reset, portal roles |
| **Learn** | CRUD on `articles`, media upload |
| **Providers** | Nearby directory CRUD |
| **Health tips** | CRUD on `health_tips` |
| **Billing** | Admin-only Premium prices (Personal/Family · monthly/yearly · NGN/USD) + subscriber list |
| **Audit** | `admin_audit_events` |

Payment processor secrets live on Supabase Edge Functions (`STRIPE_*`, `PAYSTACK_SECRET_KEY`), not in this portal `.env`.

Clinical PHI is not editable here.
