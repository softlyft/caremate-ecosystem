# ADR-005: Repository Pattern

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-07-13 |

## Context

CareMate has two physical stores (SQLite and Supabase) plus UI caches (TanStack Query, Zustand). If screens talk to Supabase or SQL directly, offline rules, sync queueing, and mapping drift multiply bugs. We need a single write/read path per domain that encodes “local first, sync later.”

## Decision

Use a **repository layer** (`src/repositories/`) as the only persistence API for domain data:

```
UI → Repository → SQLite → sync_queue → Sync Engine → Supabase
```

- `BaseRepository.queueSync()` enqueues outbound operations.
- Repositories own row ↔ domain type mapping and `syncToRemote` / `pullFromRemote` used by the sync engine.
- Screens and feature components must **not** import `@supabase/supabase-js` for CRUD.
- Auth remains in `auth-service` (session lifecycle), not mixed into entity repositories.

Mini-apps may keep Zustand for UI state but persist cloud-backed copies through snapshot repositories / synced storage when signed in.

## Consequences

- Clear test and change surface: swap storage or sync strategy without rewriting screens.
- New entities require schema + repository + sync handler — more files, fewer hidden side channels.
- Discipline is mandatory: a “quick Supabase call” in a screen is an architecture violation.
- Query libraries (TanStack Query) wrap repositories; they are not a second source of truth.
- Sync bugs concentrate in repositories/engine — invest observability there (queue depth, failures).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Screens call Supabase + cache locally ad hoc | Duplicates offline logic; easy to skip the outbox |
| Active Record models on the client | Couples UI to persistence; harder sync boundaries |
| CQRS/event sourcing early | Overkill for Phase 1–2 outbox sync |
| Single “DataService” god object | Becomes an unmaintainable cross-domain blob |
