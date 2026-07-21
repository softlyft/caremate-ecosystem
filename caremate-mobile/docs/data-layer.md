# Data Layer

[← Back to index](./README.md)

## Overview

CareMate's core app data lives in **SQLite** on the device. **Drizzle ORM** provides typed queries. **Repositories** are the only layer screens should call. **Supabase** receives changes asynchronously via the sync engine.

Database file: `caremate.db` (created on first launch).

---

## Schema (`src/database/schema.ts`)

All entity tables include sync metadata columns:

| Column | Purpose |
|--------|---------|
| `sync_status` | `pending` \| `syncing` \| `synced` \| `failed` |
| `deleted_at` | Soft delete timestamp (ISO string) |
| `created_at` | ISO timestamp |
| `updated_at` | ISO timestamp |

### Tables

#### `profiles`
User profile linked to Supabase `user_id`.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | UUID |
| user_id | text | Supabase auth UID or `guest` |
| full_name | text | |
| email, phone | text | optional |
| date_of_birth | text | ISO date |
| avatar_url | text | optional |

#### `emergency_profiles`
Critical health information for emergencies.

| Column | Type | Notes |
|--------|------|-------|
| user_id | text | Owner |
| full_name | text | |
| photo_url | text | |
| blood_group, genotype | text | |
| allergies | text | JSON array string, default `[]` |
| current_medications | text | JSON array |
| chronic_conditions | text | JSON array |
| emergency_contacts | text | JSON array of contact objects |
| preferred_hospital | text | |
| insurance_provider | text | |
| notes | text | |

#### `providers`
Healthcare facility listings (FHIR-seeded locally; optional Supabase pull). See [Provider model](./provider-model.md).

#### `user_location_samples`
Last 20 exact GPS samples for Nearby ranking. Guest samples stay local until sign-in; signed-in users sync to Supabase.

| Column | Type | Notes |
|--------|------|-------|
| name, type | text | Discriminator: hospital, clinic, pharmacy, laboratory, telemedicine, blood_bank, ambulance, … |
| address, phone, email | text | Shared core fields |
| latitude, longitude | real | For map / directions |
| is_favorite | boolean | User favorite (detail screen) |
| distance_km | real | From seed data (not live GPS) |
| attributes | text (JSON) | Type-specific bag; evolve without new tables |

#### `articles`
Learn catalog (Phase 1 = text articles). Conceptually **learn content** — see [Learn content model](./learn-content-model.md).

| Column | Type | Notes |
|--------|------|-------|
| title, summary, content | text | Shared across formats |
| content_type | text | `article` (default) … video, podcast, campaign, health_alert, faq, guide |
| category_id, category_name | text | Topic axis (heart, child, …) — orthogonal to format |
| image_url | text | |
| source_url | text | External URL (admin-synced Currents news); null for evergreen |
| published_at | text | ISO date |
| attributes | text (JSON) | Format-specific bag (media URLs, severity, steps, …) |

#### `bookmarks`
User bookmarked articles.

| Column | Type | Notes |
|--------|------|-------|
| article_id | text | Content id (no FK — Currents/local articles OK) |
| user_id | text | Owner |

#### `article_reads`
Reading progress: currently reading or finished.

| Column | Type | Notes |
|--------|------|-------|
| article_id | text | Content id (no FK) |
| user_id | text | Owner |
| status | text | `reading` \| `read` |
| opened_at | text | First open |
| read_at | text | When marked read (nullable) |

#### `settings`
Per-user app preferences.

| Column | Type | Notes |
|--------|------|-------|
| user_id | text | |
| theme | text | `light` \| `dark` \| `system` |
| notifications_enabled | boolean | |
| subscribed_category_ids | text | JSON array |

#### `sync_queue`
Outbound sync operations.

| Column | Type | Notes |
|--------|------|-------|
| entity_type | text | e.g. `emergency_profile` |
| entity_id | text | |
| operation | text | `upsert` \| `delete` |
| payload | text | JSON snapshot |
| attempts | integer | Retry count |
| last_error | text | Last failure message |

#### `analytics_queue`
Offline-first PostHog outbox (independent of Supabase).

| Column | Type | Notes |
|--------|------|-------|
| kind | text | `event` \| `screen` |
| name | text | Event or screen name |
| properties | text | JSON props |
| distinct_id | text | Signed-in user id at enqueue time (nullable for guests) |
| occurred_at | text | Original local timestamp |
| attempts | integer | Retry count (max in `ANALYTICS_QUEUE_CONFIG`) |
| last_error | text | Last flush failure |

`trackEvent` / `trackScreen` enqueue here immediately. The queue drains to PostHog when online (sync-engine reconnect/cycle, PostHog client bind, or debounced flush after enqueue). See [Sync Engine](./SYNC_ENGINE.md#analytics-outbox).

#### `sync_metadata`
Key-value store for sync cursors and timestamps.

---

## Database client (`src/database/client.ts`)

Responsibilities:
1. Open SQLite database with `expo-sqlite`
2. Apply PRAGMAs, baseline legacy installs if needed, then run Drizzle migrations
3. Export `getDatabase()` → Drizzle instance
4. Export `initializeDatabase()` → called once at boot

**Schema source of truth:** `src/database/schema.ts`  
**Migrations:** Generated by Drizzle Kit into `src/database/migrations/` (`npm run db:generate`). Applied at boot via `migrate()` from `drizzle-orm/expo-sqlite/migrator`.

Do not hand-edit `CREATE TABLE` SQL in `client.ts`. Change `schema.ts`, generate a migration, ship the new files with the app.

Legacy devices that already had tables from the old inline SQL are baselined once (journal marked applied) so the initial migration is not re-run.

---

## Repositories

### Base repository

`src/repositories/base-repository.ts` provides:

```typescript
protected async queueSync(entityType, entityId, operation, payload)
```

Inserts a row into `sync_queue` for the sync engine to process.

### Profile repository

| Method | Description |
|--------|-------------|
| `findByUserId(userId)` | Get profile |
| `save(profile)` | Upsert profile + queue sync |
| `getSettings(userId)` | Read settings row |
| `saveSettings(settings)` | Upsert settings + queue sync |

### Emergency repository

| Method | Description |
|--------|-------------|
| `findByUserId(userId)` | Get emergency profile |
| `save(userId, input)` | Upsert + queue sync; callers also sync lock surface |

JSON array fields (allergies, medications, contacts, etc.) are stored as strings and parsed in the repository layer.

Lock-screen snapshot (separate from SQLite): AsyncStorage keys via `domains/emergency/lock-surface.ts`.

### Article repository

| Method | Description |
|--------|-------------|
| `purgeLegacySeeds()` / `pullFromRemote()` | Soft-delete legacy local ids; pull published (+ tombstones) from Supabase |
| `findAll(search?, userKey?)` | Local articles, ordered for Learn feed |
| `findByCategory(categoryId, userKey?)` | Filter by category id |
| `findById(id)` | Single article |
| `findTrending(limit, userKey?, countryCode?)` | Home mix: 1 evergreen + 2 INT + up to 2 country news from SQLite |
| `getTrendingToday(limit, options)` | Offline-first trending (local only; passes `countryCode`) |
| `pullFromRemote()` | Pull published catalog + external news from Supabase; reconcile unpublished external rows; purge external news older than 3 calendar days (`firstSeenAt`) |
| `purgeStaleExternalNews()` | Soft-delete local external news outside today / yesterday / 2 days ago |
| `reconcileExternalNews(remoteLiveIds)` | Soft-delete local external news missing from the published remote set |
| `toggleBookmark(userId, articleId)` | Add/remove bookmark + sync queue |
| `getBookmarks(userId)` | Bookmarked articles |
| `isBookmarked(userId, articleId)` | Bookmark check |
| `markReading` / `markRead` / `toggleMarkRead` | Reading state + sync (`article_reads`) |
| `getArticlesByReadStatus(userId, status)` | Reading history lists |
| `getReadStatus(userId, articleId)` | `reading` \| `read` \| null |

### Provider repository

| Method | Description |
|--------|-------------|
| `purgeBundledProviders()` | Soft-delete legacy bundled/demo provider rows from SQLite |
| `findNearby(…)` | Online `nearby_providers` RPC (default limit 15); caches the page; falls back to local cache offline |
| `searchByName(…)` | Online `search_providers_by_name` RPC (no geo); used by Nearby search box and global search |
| `findAll()` | Local-only reads (last nearby cache, favorites), distance-ordered |
| `findById(id)` | Single provider from SQLite, or Supabase by id when online |
| `toggleFavorite(…)` | Toggle favorite + sync queue |
| `pullFromRemote()` | Purge bundled rows + sync favorites only (not the full national catalog) |

---

## Sync engine (`src/sync/`)

Full flows, diagrams, and failure behavior: **[SYNC_ENGINE.md](./SYNC_ENGINE.md)**.

### Policy

| Trigger | Behavior |
|---------|----------|
| Local write → `sync_queue` | Debounced push (~1.5s) when online |
| Network reconnect | Immediate sync |
| App foreground | Immediate sync |
| Local midnight (app open) | Immediate sync |
| Background task (~daily) | Best-effort OS-scheduled sync while closed |
| Startup / sign-in | Sync + migrate mini-apps into snapshots |

Offline: all reads/writes stay local. Online: queue drains immediately (not only on cold start).

Exact 12:00 AM while the process is dead is **not** guaranteed by iOS/Android; the background task is the OS safety net (often overnight), and the next open/reconnect always drains the queue.

### `engine.ts`

- `start()` — network watcher, AppState, midnight timer, interval, first cycle
- `requestSync()` — debounced or immediate cycle request
- `runSyncCycle()` — push queue then pull (also used by headless background task)
- `stop()` — cleans up timers/subscriptions
- Handlers: profiles, emergency_profiles, providers, user_location_samples, articles, health_tips, bookmarks, article_reads, settings, **mini_app_snapshots**, family, subscriptions (pull)
- Respects `SYNC_CONFIG`:
  - `maxRetries: 5`
  - `retryDelayMs: 2000`
  - `pullIntervalMs: 60000` (open-app safety interval)
  - `writeDebounceMs: 1500`

### `queue.ts`

CRUD helpers for `sync_queue`. Every enqueue also calls `syncEngine.requestSync()`.

### `network.ts`

Uses `expo-network` to detect connectivity. Sync skips push/pull when offline.

### `background-daily-sync.ts`

Registers `expo-background-task` (~24h minimum interval) so a closed app can still flush the queue when the OS allows (needs network + enough battery).

---

## TanStack Query integration

Query keys defined in `src/constants/config.ts` → `QUERY_KEYS`.

Typical screen pattern:

```typescript
const { data, isLoading } = useQuery({
  queryKey: [...QUERY_KEYS.articles, search, userKey],
  queryFn: () => articleRepository.findAll(search || undefined, userKey),
});
```

After a mutation:

```typescript
await emergencyRepository.save(profile);
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergency(userId) });
```

---

## Mini-apps data

UI stores remain Zustand + AsyncStorage for snappy offline UX. For **signed-in** users, each persist write also mirrors into SQLite `mini_app_snapshots` and the sync queue → Supabase `mini_app_snapshots` (JSON payload per app).

| App key | AsyncStorage key | Contents |
|---------|------------------|----------|
| `vitals` | `caremate-vitals-tracker` | Vital readings + unit preferences |
| `medication` | `caremate-medication-tracker` | Medicines, schedule, dose logs, refill |
| `checkup` | `caremate-checkup-planner` | DOB/gender/region, completions |
| `immunization` | `caremate-immunization-tracker` | Child profiles, vaccine records |
| `pregnancy` | `caremate-pregnancy-tracker` | Pregnancy profile, daily logs |
| `period` | `caremate-period-tracker` | Cycle settings, logged period days |

Guest mode stays device-local only (no cloud mirror).

Apply via CLI (ecosystem root): `npm run supabase:db:push` (migration `supabase/migrations/*_mini_app_snapshots.sql`).

See [Mini-Apps](./mini-apps.md) and [Roadmap](./roadmap.md).

---

## Adding a new entity

1. Add table to `database/schema.ts`
2. Add `CREATE TABLE` SQL to `database/client.ts`
3. Create `src/repositories/<entity>-repository.ts`
4. Add sync handler in `sync/engine.ts` for Supabase table
5. Add `QUERY_KEYS` entry
6. Wire screen with `useQuery` / `useMutation`

---

## Related docs

- [Architecture](./architecture.md) — data flow diagrams
- [Configuration](./configuration.md) — sync config constants
