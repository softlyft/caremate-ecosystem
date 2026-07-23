# Project Structure

[← Back to index](./README.md)

## Repository Layout

```text
caremate-mobile/
├── assets/
├── docs/                   Documentation + ADRs
├── modules/                Local native modules (Android emergency widget)
├── src/                    Application source
├── app.json
├── package.json
└── …
```

Cloud migrations and shared backend infrastructure do **not** live inside this app. They live at the monorepo root in `../supabase/`.

## `src/` Directory

```text
src/
├── app/                 Expo Router screens and layouts
├── components/          Shared UI, app providers, nav chrome
├── constants/           Config, env helpers, guest defaults, assets
├── database/            SQLite client + Drizzle schema
├── domains/             Vertical slices with repositories and domain logic
├── features/            Screen-composition and shell-adjacent UI
├── hooks/               Shared hooks
├── lib/                 Storage adapters and Supabase client helpers
├── mini-apps/           Health tracker modules + shared mini-app kit
├── repositories/        Shared base repository primitives
├── services/            Cross-cutting services such as auth
├── sync/                Queue, engine, handlers, background sync
├── theme/               Colors, typography, layout tokens
├── types/               Shared app-level types
├── utils/               Utility helpers
└── widgets/             Retired lock-widget stub (no native iOS extension)
```

## Domains

Current domain modules under `src/domains/`:

| Domain | Purpose |
|--------|---------|
| `articles/` | Learn content, article querying, Currents refresh |
| `billing/` | Premium state, checkout helpers, entitlement state |
| `emergency/` | Emergency profile data and lock-surface sync |
| `family/` | Household, spouse connection, child profile flows |
| `onboarding/` | Onboarding flow state, device defaults, setup routing |
| `profile/` | User profile/settings persistence and helpers |
| `providers/` | Nearby provider lookup, favorites, location helpers |
| `search/` | Cross-domain search across articles, providers, and tools |
| `tips/` | Health tip repository and local cache |

Each domain generally owns:

- Repository logic
- Query/mapping helpers
- Domain-specific components where useful
- Sync hooks where the entity participates in cloud sync

## Features

`src/features/` contains UI that composes domain data into screens or shared shell behavior:

| Feature | Purpose |
|---------|---------|
| `auth/` | Zustand auth store and auth-facing UI state |
| `home/` | Home tab sections and cards |
| `profile/` | Patient ID card and profile rows |
| `notifications/` | Placeholder area for future notification-specific UI |

## Mini-Apps

The five mini-apps live under `src/mini-apps/`:

- `period-tracker/`
- `pregnancy-tracker/`
- `immunization-tracker/`
- `medication-tracker/`
- `checkup-planner/`

Shared mini-app infrastructure lives under `src/mini-apps/_kit/`:

| Piece | File |
|-------|------|
| Launcher registry | `_kit/registry.ts` |
| Shared card/header/theme | `_kit/MiniAppCard.tsx`, `_kit/components/*`, `_kit/theme.ts` |
| Synced Zustand storage | `_kit/synced-storage.ts` |
| Snapshot repository | `_kit/snapshot-repository.ts` |
| Rehydrate and migration helpers | `_kit/hydrate.ts`, `_kit/rehydrate-registry.ts` |

Mini-app routes live under `src/app/(app)/apps/<app-id>/`.

See [Mini-Apps](./mini-apps.md) and [Mini-app contract](./mini-app-contract.md).

## Sync Platform

The sync system lives in `src/sync/`:

| File | Role |
|------|------|
| `registry.ts` | Handler registration and lookup |
| `register-default-handlers.ts` | Wires repositories into the sync engine |
| `engine.ts` | Push/pull orchestration and trigger lifecycle |
| `queue.ts` | Local outbox and write scheduling |
| `network.ts` | Connectivity checks |
| `background-daily-sync.ts` | Daily background sync registration |
| `cloud-types.ts` | Shared remote row typing helpers |

## Routing Structure

`src/app/` is organized around Expo Router groups:

| Area | Purpose |
|------|---------|
| `src/app/_layout.tsx` | Root layout/bootstrap |
| `src/app/index.tsx` | Entry redirect based on onboarding/auth state |
| `src/app/(auth)/` | Login, register, forgot password, onboarding |
| `src/app/(app)/` | Signed-in or guest app shell |
| `src/app/(app)/(tabs)/` | Home, Learn, Nearby, Apps, Profile tabs |
| `src/app/(app)/setup/` | Post-onboarding setup screens |
| `src/app/(app)/family/` | Family routes |
| `src/app/(app)/articles/` | Article detail/category/bookmarks routes |
| `src/app/(app)/providers/` | Provider detail and map placeholder |
| `src/app/(app)/emergency/` | Emergency detail/edit/QR routes |
| `src/app/(app)/apps/` | Mini-app screens |
| `src/app/emergency-lock.tsx` | Public emergency lock card route |

See [Navigation](./navigation.md) for the full route map.

## Adding Code

| Task | Where to add it |
|------|-----------------|
| New mini-app | `src/mini-apps/<id>/` + routes + `_kit` registry wiring |
| New synced entity | `src/domains/<name>/` + repository + `sync/register-default-handlers.ts` |
| Shared UI primitive | `src/components/ui/` |
| New screen-composition UI | `src/features/` |
| Auth/guest behavior | `src/features/auth/`, `src/services/auth-service.ts`, `src/constants/guest.ts` |
| Device-local schema changes | `src/database/schema.ts` and `src/database/client.ts` |

## Related Docs

- [Navigation](./navigation.md)
- [Architecture](./architecture.md)
- [Data Layer](./data-layer.md)
- [Supabase alignment](./supabase-alignment.md)
