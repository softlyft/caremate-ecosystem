# Supabase ↔ SQLite alignment

[← Back to index](./README.md) · [Sync Engine](./SYNC_ENGINE.md)

## Status (reviewed)

| Layer | Status |
|-------|--------|
| SQLite (device) | Complete via `database/schema.ts` + `client.ts` migrations |
| Sync engine / handlers | Intact (`register-default-handlers.ts`) |
| Supabase remote | Was **only** `mini_app_snapshots` until core migration applied |

Device-only (never on Supabase): `sync_queue`, `sync_metadata`.

## Table map

| SQLite | Supabase | Sync |
|--------|----------|------|
| `profiles` | `profiles` | push + pull (RLS by `user_id`) |
| `settings` | `settings` | push + pull |
| `emergency_profiles` | `emergency_profiles` | push + pull |
| `providers` | `providers` | pull catalog; on favorite push also upserts stub + `provider_favorites` |
| *(favorite flag on providers row)* | `provider_favorites` | per-user; merged into local `is_favorite` on pull |
| `articles` | `articles` | pull (push no-op — Currents/evergreen local/seed) |
| `bookmarks` | `bookmarks` | push + pull |
| `mini_app_snapshots` | `mini_app_snapshots` | push + pull |
| `subscription_entitlements` | `subscriptions` (+ `subscription_prices` read) | **pull only** (webhooks own writes) |
| `sync_queue` | — | device outbox |
| `sync_metadata` | — | device cursors |

## Column alignment notes

- **JSON:** SQLite stores JSON as `text`; Postgres uses `jsonb` (`allergies`, `attributes`, `payload`, etc.). Clients send/receive arrays/objects; mappers `stringifyJson` / `parseJson` on device.
- **Learn:** `content_type`, `attributes` exist on both sides for Phase 2 formats.
- **Providers:** shared `attributes` jsonb; favorites are **not** a column on remote `providers`.
- **Timestamps:** ISO strings locally; `timestamptz` remotely.
- **Bookmarks / favorites:** no FK to catalog tables — local-only Currents articles and seed providers must still sync user prefs.

## Migrations

Cloud migrations live at the **ecosystem root** (`../supabase/migrations/`), not under this app.

```bash
# from caremate-ecosystem/
npm run supabase:migration:list
npm run supabase:db:push
```

Or from this app (proxies to root): `npm run supabase:db:push`

Core cloud schema: `../supabase/migrations/20260713210000_core_sync_schema.sql`  
Mini-apps: `../supabase/migrations/20260713195606_mini_app_snapshots.sql`  
Admin portal RBAC: `../supabase/migrations/20260714160000_admin_portal_rbac.sql`  
Billing: `../supabase/migrations/20260714180000_billing_subscriptions.sql`

## Sync still intact

```
UI → repository → SQLite → sync_queue → handler.push → Supabase
                                         handler.pull → SQLite
```

Handlers still registered for: `profiles`, `settings`, `emergency_profiles`, `providers`, `articles`, `bookmarks`, `mini_app_snapshots`, family entities, `subscriptions` (pull-only).

Missing remote tables previously caused push/pull to fail quietly (handler catch / empty pull → seed). After `db push`, signed-in sync should succeed for those entities.
