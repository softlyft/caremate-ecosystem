# CareMate Mobile

Offline-first patient-centric healthcare app built with Expo, SQLite, and Supabase.

This app lives in the **caremate-ecosystem** monorepo. Shared cloud schema: [`../supabase/`](../supabase/). See [`../README.md`](../README.md).

## Stack

- React Native + Expo Router
- SQLite (Drizzle ORM) as on-device source of truth
- Repository + background sync engine
- Supabase Auth / PostgreSQL (schema owned at ecosystem root)
- Zustand (UI/session state) + TanStack Query (server-shaped data)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Add your Supabase project URL and anon key, or use **Continue Offline Demo** on the login screen.

4. Start the app:

```bash
npm run start
```

## Architecture

```
UI → Repository → SQLite → Sync Engine → Supabase
```

The UI never talks to Supabase directly. Writes are saved locally first and queued for background sync.

## Project Structure

```
src/
  app/              # Expo Router screens
  components/       # Shared UI
  features/         # Feature modules (auth, profile, ...)
  database/         # Drizzle schema + SQLite bootstrap
  repositories/     # Data access layer
  services/         # Auth and integrations
  sync/             # Offline sync engine
  theme/            # Design tokens
  types/            # Shared TypeScript types
```

## Scripts

- `npm run start` — start Expo dev server
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm run db:generate` — generate Drizzle migrations

## Phase 1 Status

Foundation implemented:

- App scaffold + navigation shells
- SQLite schema and bootstrap
- Sync queue and engine
- Repositories for profile, emergency, articles, providers
- Auth flow with SecureStore + biometric toggle
- Phase 1 screens (dashboard, emergency, articles, providers, profile)

Next up:

- Supabase table migrations (remote)
- QR rendering
- Native maps
- Gluestack UI theming pass
- Push notifications / PostHog / Sentry

See `CareMate.md` for the full engineering guide.
