# ADR-003: Why Supabase

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-07-13 |

## Context

CareMate still needs cloud **auth**, cross-device backup, and a managed Postgres API without standing up a custom NestJS (or similar) backend in Phase 1–2. The offline-first SQLite layer needs a remote peer that supports row-level security and straightforward client SDKs.

## Decision

Use **Supabase** for:

- Email/password **Auth**
- Hosted **PostgreSQL** tables mirroring domain data (profiles, emergency, articles, bookmarks, providers, settings, `mini_app_snapshots`, …)
- **RLS** scoped to `auth.uid()`
- Schema changes via **Supabase CLI migrations** (ecosystem `supabase/migrations/`, `npm run supabase:db:push` from repo root)

The app must remain usable when Supabase is not configured (guest + local SQLite / demo). Edge Functions and a NestJS integration layer are deferred (Phase 3 for a heavier backend).

## Consequences

- Fast path to auth + cloud backup without owning servers day one.
- Screens must not call Supabase directly for domain data — only repositories / auth service + sync engine (see [ADR-005](./005-repository-pattern.md)).
- Product behavior depends on correct RLS; misconfigured policies leak or block data.
- Remote schema can drift from SQLite if migrations are not disciplined — CLI migrations are mandatory for cloud tables.
- Vendor coupling to Supabase Auth/API shapes; migrating later is possible but non-trivial.
- Background and write-triggered sync assumes Supabase availability when online; offline queue covers gaps.

## Alternatives considered

| Option | Why not (Phase 1–2) |
|--------|---------------------|
| Custom NestJS + Postgres | Higher ops and auth surface before product–market fit |
| Firebase | We prefer SQL/Postgres and RLS-shaped access for health records |
| AWS Amplify / AppSync | Heavier AWS footprint than needed for current scope |
| No cloud at all | Cannot restore after device loss or sign-in on a second phone |
