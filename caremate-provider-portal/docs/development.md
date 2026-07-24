# Development

## Prerequisites

- Monorepo root install (`npm install` from repo root)
- Supabase project with provider portal migrations applied
- Catalog organizations (via ingest) with contact emails for claim

## Env

```bash
cp caremate-provider-portal/.env.example caremate-provider-portal/.env.local
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser / server user client |
| `SUPABASE_SERVICE_ROLE_KEY` | Claim completion + bootstrap (server only) |

## Migrations

Apply at least:

1. `20260719140000_provider_portal.sql`
2. `20260719150000_provider_org_claims.sql`
3. `20260719160000_provider_connection_bidirectional.sql`
4. `20260719170000_connection_rejection_and_verified.sql`

Then regenerate types when ready: `npm run db:types`.

## Scripts

From monorepo root:

| Command | Description |
|---------|-------------|
| `npm run provider-portal:dev` | Next.js on **http://localhost:4000** |
| `npm run provider-portal:build` | Production build |
| `npm run bootstrap:member -w caremate-provider-portal -- …` | Ops membership seed |

Workspace package scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `bootstrap:member`.

## Local smoke

1. Claim an org at `/claim` (catalog email) → confirm `verification_status` shows verified on Organization.
2. Sign out / sign in at `/login`.
3. Connection requests: request by a real CareMate Patient ID → patient sees it under Me → Connections.
4. From mobile Nearby detail on that org: Connect → approve in portal inbound list (with / without rejection reason flows).
5. Messages: compose to connected patients → confirm mobile inbox + optional push; reply both ways.
6. Patient detail → Mark as staff → confirm Staff badge; mobile New message search finds the staff user.

Apply migrations through `20260724170000_*` and run `npm run db:types` after schema changes.

## Related

- [Architecture](./architecture.md)
- [Auth & claim](./auth-claim.md)
- [Messaging](./messaging.md)
- [QA testing](./qa-testing.md)
