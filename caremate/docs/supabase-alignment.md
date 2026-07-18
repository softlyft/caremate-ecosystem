# Supabase ↔ SQLite alignment

[← Back to index](./README.md) · [Sync Engine](./SYNC_ENGINE.md)

## Status (reviewed)

| Layer | Status |
|-------|--------|
| SQLite (device) | Complete via `database/schema.ts` + generated `database/migrations/` |
| Sync engine / handlers | Intact (`register-default-handlers.ts`) |
| Supabase remote | Active across profiles, settings, emergency, providers favorites, articles, tips, bookmarks, family, billing cache, and mini-app snapshots |

Device-only (never on Supabase): `sync_queue`, `sync_metadata`.

## Table map

| SQLite | Supabase | Sync |
|--------|----------|------|
| `profiles` | `profiles` | push + pull (RLS by `user_id`) |
| `settings` | `settings` | push + pull |
| `emergency_profiles` | `emergency_profiles` | push + pull |
| `providers` | `providers` | pull catalog; on favorite push also upserts stub + `provider_favorites` |
| *(favorite flag on providers row)* | `provider_favorites` | per-user; merged into local `is_favorite` on pull |
| `articles` | `articles` | pull-only from Supabase (portal CMS); guests via anon RLS on published rows |
| `health_tips` | `health_tips` | pull-only from Supabase (portal CMS); guests via anon RLS |
| `bookmarks` | `bookmarks` | push + pull |
| `article_reads` | `article_reads` | push + pull |
| `mini_app_snapshots` | `mini_app_snapshots` | push + pull |
| `family_households` | `family_households` | push + pull |
| `family_members` | `family_members` | push + pull |
| `family_connection_requests` | `family_connection_requests` | push + pull |
| `subscription_entitlements` | `subscriptions` (+ `subscription_prices` read; `payments` is cloud-only) | **pull only** (webhooks / verify-checkout own writes) |
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
Family: `../supabase/migrations/20260713233000_family_profiles.sql`  
Admin portal RBAC: `../supabase/migrations/20260714160000_admin_portal_rbac.sql`  
Billing: `../supabase/migrations/20260714180000_billing_subscriptions.sql`, `../supabase/migrations/20260717190000_payments_ledger.sql`, `../supabase/migrations/20260717193000_admin_activated_subscriptions.sql`  
Article reads: `../supabase/migrations/20260718010000_article_reads.sql`

## Sync still intact

```
UI → repository → SQLite → sync_queue → handler.push → Supabase
                                         handler.pull → SQLite
```

Handlers still registered for: `profiles`, `settings`, `emergency_profiles`, `providers`, `articles`, `health_tips`, `bookmarks`, `article_reads`, `mini_app_snapshots`, family entities, `subscriptions` (pull-only).
