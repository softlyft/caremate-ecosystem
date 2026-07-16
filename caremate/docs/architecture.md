# Architecture

[← Back to index](./README.md)

Significant choices (Expo, SQLite, Supabase, guest-first, repositories) are recorded as [ADRs](./adr/README.md). Sync outbox behavior is documented in [SYNC_ENGINE.md](./SYNC_ENGINE.md).

## High-level diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation                          │
│  Expo Router screens (src/app/) + feature components         │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
│    Zustand    │   │ TanStack Query│   │ Mini-apps         │
│ Auth, Settings│   │ Domains       │   │ (_kit + modules)  │
└───────┬───────┘   └───────┬───────┘   └─────────┬─────────┘
        │                   │                     │
        ▼                   ▼                     ▼
┌───────────────┐   ┌───────────────────────────────────────┐
│ Auth Service  │   │     Domain repositories                 │
│ (Supabase)    │   │ articles, emergency, providers, profile │
│               │   │ + mini_app_snapshots                    │
└───────┬───────┘   └───────────────────┬───────────────────┘
        │                               │
        ▼                               ▼
┌───────────────┐               ┌───────────────┐
│   Supabase    │◄──────────────│    SQLite     │
│ Auth + PG     │   Sync Engine │  caremate.db  │
└───────────────┘               └───────────────┘
```

---

## Layer responsibilities

### Presentation (`src/app/`, `src/components/`, `src/features/*/components/`)

- Renders UI only
- Calls repositories via TanStack Query hooks or Zustand actions
- Handles loading, empty, error, and offline states
- Must not import `@supabase/supabase-js` directly in screens

### Repositories (`src/domains/*/repository.ts`, `src/repositories/base-repository.ts`)

- Single entry point per domain for reads and writes (live under `domains/`)
- Writes to SQLite immediately (optimistic local truth)
- Enqueues sync operations via `BaseRepository.queueSync()`
- Register push/pull with `sync/registry` (see `register-default-handlers.ts`)

### Sync engine (`src/sync/`)

- `engine.ts` — orchestrates push/pull; triggers on write, reconnect, foreground, midnight (while open), interval, and background task
- `registry.ts` + `register-default-handlers.ts` — domain/mini-app handlers plug in here
- `queue.ts` — CRUD on `sync_queue` table (+ requests sync after enqueue)
- `network.ts` — online detection via `expo-network`
- `background-daily-sync.ts` — `expo-background-task` daily safety net while closed
- Retries failed operations (config in `SYNC_CONFIG`)
- Never blocks the UI thread waiting for network

### Services (`src/services/`)

- Cross-cutting integrations (currently `auth-service.ts` only)
- Supabase auth API, biometric flags, onboarding completion

### Database (`src/database/`)

- `client.ts` — opens SQLite, runs inline migrations, exports Drizzle instance
- `schema.ts` — Drizzle table definitions
- Migrations: hand-written SQL in `client.ts` today; Drizzle Kit configured for future generated migrations

---

## Data flow: write path

```
User taps Save
      ↓
Screen calls repository.save()
      ↓
Repository INSERT/UPDATE SQLite (sync_status = 'pending')
      ↓
Repository inserts row into sync_queue
      ↓
Screen / Query cache updates immediately
      ↓
[If online] syncEngine.requestSync() drains queue soon
      ↓
Supabase upsert
      ↓
SQLite sync_status = 'synced'
```

The user never waits on step 6–8.

---

## Data flow: read path

```
Screen mounts
      ↓
useQuery({ queryKey, queryFn: () => repository.findAll() })
      ↓
Repository reads SQLite
      ↓
(Optional) syncEngine pull refreshes from Supabase
      ↓
Query cache updates → UI re-renders
```

Default query `staleTime` is 30 seconds (`AppProviders.tsx`).

---

## Bootstrap sequence

Defined in `src/components/AppProviders.tsx` → `BootstrapGate`:

1. **`initializeDatabase()`** — create/open `caremate.db`, run `CREATE TABLE IF NOT EXISTS` migrations
2. **`articleRepository.pullFromRemote()`** — pull Learn catalog from Supabase (guests included)
3. **`providerRepository.seedIfEmpty()`** — insert sample providers if table empty
4. **`useAuthStore.initialize()`** — restore Supabase session or default to guest
5. **`syncEngine.start()`** — begin background sync loop

Until steps 1–4 complete, a full-screen spinner is shown. Root layout also waits for fonts (`useAppFonts`) and `isInitialized` before hiding splash.

On unmount, `syncEngine.stop()` is called.

---

## State management rules

| Store | Technology | Stores |
|-------|------------|--------|
| Auth session | Zustand | `user`, `isGuest`, `isAuthenticated`, `biometricEnabled` |
| Settings UI | Zustand | `theme`, `notificationsEnabled` (hydrated from SQLite on settings screen) |
| Mini-apps | Zustand + persist | Period, pregnancy, immunization data |
| Articles, providers, profiles | TanStack Query | Never in Zustand |

**Rule:** Do not put server collections (article lists, provider lists) in Zustand.

---

## Guest mode architecture

- Constant `GUEST_USER_ID = 'guest'` in `src/constants/guest.ts`
- `useCurrentUserId()` returns authenticated user ID or `'guest'`
- Repositories scope bookmarks, settings, and profiles by `user_id`
- Guest users get local-only rows; sync queue operations may no-op or fail gracefully when not authenticated

---

## Mini-apps exception

Period, Pregnancy, and Immunization trackers **bypass** the repository/SQLite/sync stack. They use:

```
Zustand → persist middleware → AsyncStorage
```

This is intentional for rapid MVP delivery but creates a documentation and architecture gap. Migrating mini-apps to SQLite is on the [roadmap](./roadmap.md).

---

## Security model

| Asset | Storage |
|-------|---------|
| Supabase session tokens | Expo SecureStore (native) |
| Session tokens (web) | AsyncStorage fallback |
| Biometric preference | SecureStore key `biometric_enabled` |
| Onboarding flag | SecureStore |
| Health data (core app) | SQLite (device-local) |
| Mini-app data | AsyncStorage (device-local) |

Never store secrets in plain AsyncStorage on native platforms.

---

## Web vs native differences

| Concern | Native | Web |
|---------|--------|-----|
| SQLite | Full support | Experimental (WASM); bootstrap may fail |
| SecureStore | Yes | Falls back to AsyncStorage |
| Biometrics | `expo-local-authentication` | Limited |
| Splash screen | Native plugin | Browser tab |

---

## Extension points (future)

- **Phase 2:** Family profiles, medication module, reminder engine
- **Phase 3:** NestJS + FHIR adapter behind repositories
- **Phase 4:** Telemedicine, wearables, AI assistant

Repositories and sync queue are designed so new entity types add a table + repository + sync handler without rewriting existing features.

---

## Related docs

- [Data Layer](./data-layer.md) — schema and repository details
- [Authentication](./authentication.md) — session lifecycle
- [Project Structure](./project-structure.md) — file locations
