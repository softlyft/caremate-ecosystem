# Project Structure

[← Back to index](./README.md)

## Repository layout

```
caremate/
├── assets/
├── docs/                   # Documentation + ADRs
├── modules/                # Local native modules (Android emergency widget)
├── src/                    # Application source
├── supabase/               # Remote Postgres migrations (CLI)
├── app.json
├── package.json
└── …
```

---

## `src/` directory

```
src/
├── app/                 # Expo Router — thin screens
├── components/          # Shared UI + AppProviders
├── constants/           # Config, env, guest, assets
├── database/            # SQLite client + Drizzle schema (platform)
├── domains/             # Core vertical slices
│   ├── articles/        # learn UI helpers, repo, Currents
│   ├── emergency/       # constants, lock surface, repo
│   ├── profile/         # settings store + repo
│   └── providers/       # FHIR seeds + repo
├── features/            # Shell / platform-adjacent modules
│   ├── auth/
│   ├── home/            # Home composition UI
│   ├── family/          # placeholder
│   └── notifications/   # placeholder
├── hooks/
├── lib/                 # Supabase client, SecureStore adapters
├── mini-apps/           # Product growth modules
│   ├── _kit/            # registry, sync storage, hydrate, calendar
│   ├── medication-tracker/
│   ├── checkup-planner/
│   ├── immunization-tracker/
│   ├── pregnancy-tracker/
│   └── period-tracker/
├── repositories/        # BaseRepository only (domain repos live in domains/)
├── services/            # auth-service (and other cross-cutting APIs)
├── sync/                # engine, queue, network, handler registry
├── theme/
├── types/
├── utils/
└── widgets/             # iOS lock widget
```

See [ADR-006](./adr/006-core-vs-mini-apps.md) and [Mini-app contract](./mini-app-contract.md).

---

## Domains (core)

| Domain | Path | Public entry |
|--------|------|----------------|
| Articles / Learn | `domains/articles/` | `domains/articles/index.ts` |
| Emergency | `domains/emergency/` | `domains/emergency/index.ts` |
| Providers | `domains/providers/` | `domains/providers/index.ts` |
| Profile | `domains/profile/` | `domains/profile/index.ts` |

Each domain owns its repository, seed/helpers, and UI pieces used by routes. Screens import public APIs.

---

## Mini-apps

| Piece | Path |
|-------|------|
| Launcher registry | `mini-apps/_kit/registry.ts` → `MINI_APPS` |
| Synced Zustand storage | `mini-apps/_kit/synced-storage.ts` |
| Hydrate / migrate | `mini-apps/_kit/hydrate.ts` |
| Snapshot repository | `mini-apps/_kit/snapshot-repository.ts` |
| Shared calendar | `mini-apps/_kit/components/MonthCalendarGrid.tsx` |
| App modules | `mini-apps/<id>/` |
| Routes | `app/(app)/apps/<id>/` |

New mini-app checklist: [mini-app-contract.md](./mini-app-contract.md).

---

## Sync platform

| File | Role |
|------|------|
| `sync/registry.ts` | `registerSyncHandler` / lookup |
| `sync/register-default-handlers.ts` | Wires core + mini-app snapshot handlers |
| `sync/engine.ts` | Orchestrates push/pull; no hard-coded entity map |
| `sync/queue.ts` | Outbox + requestSync on write |
| `sync/background-daily-sync.ts` | Closed-app safety net |

---

## `src/app/` — routing

Unchanged Expo Router tree (`(auth)`, `(app)/(tabs)`, `apps/*`, `emergency`, `articles`, `providers`, `profile`). Tab screens stay thin.

---

## Adding code

| Task | Where |
|------|--------|
| New mini-app | `src/mini-apps/<id>/` + routes + `_kit` registry + snapshot key (+ Supabase check if needed) |
| New core entity | Prefer `src/domains/<name>/` + register sync handler |
| Shared UI primitive | `src/components/ui/` |
| Auth / guest | `features/auth`, `services/auth-service`, `constants/guest` |
