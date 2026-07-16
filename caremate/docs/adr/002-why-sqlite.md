# ADR-002: Why SQLite

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-07-13 |

## Context

CareMate’s product premise is **offline-first**: emergency profiles, bookmarks, providers, settings, and mini-app data must remain usable with poor or no connectivity. A purely remote API would make healthcare moments unreliable. Client persistence must support structured queries, sync metadata, and a durable outbox.

## Decision

Use **on-device SQLite** (`expo-sqlite`) as the **source of truth for persisted app data**, accessed through Drizzle ORM and repositories.

- Local writes succeed immediately; network is optional.
- Sync status and a `sync_queue` outbox live in the same database.
- Mini-apps keep a fast AsyncStorage cache but mirror signed-in state into SQLite snapshots for sync.

## Consequences

- UI reads/writes feel instant offline; Supabase is a backup/sync peer, not the interactive datastore.
- Schema changes use Drizzle Kit migrations (`npm run db:generate` → `src/database/migrations/`, applied at boot).
- Conflict handling and merge rules live in the sync layer (device often wins for pending local writes).
- SQLite-on-web remains experimental; mobile is the reference offline experience.
- Storage grows on-device; cleanup/retention policies may be needed later for large article caches.

## Alternatives considered

| Option | Why not |
|--------|---------|
| AsyncStorage / MMKV only | Weak querying, no relational integrity, awkward outbox and multi-entity sync |
| Remote-only (Supabase as source of truth) | Breaks offline emergency and guest use; every action waits on network |
| WatermelonDB / RxDB | Heavier sync abstraction than we need for Phase 1–2 outbox pattern |
| Files / JSON dumps | Poor for indexed lists (articles, providers) and concurrent updates |
