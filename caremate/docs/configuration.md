# Configuration

[← Back to index](./README.md)

## Environment variables

File: `.env` (copy from `.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `EXPO_PUBLIC_CURRENTS_API_KEY` | No | Currents API key for external health news |
| `EXPO_PUBLIC_CURRENTS_COUNTRY` | No | Default Currents country (`INT` = international) |

Read in `src/constants/env.ts`:

```typescript
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  isSupabaseConfigured: Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  currentsApiKey: process.env.EXPO_PUBLIC_CURRENTS_API_KEY ?? '',
  isCurrentsConfigured: Boolean(process.env.EXPO_PUBLIC_CURRENTS_API_KEY),
  currentsCountry: process.env.EXPO_PUBLIC_CURRENTS_COUNTRY ?? 'INT',
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
};
```

Only `EXPO_PUBLIC_*` variables are available in the Expo client bundle. The app runs without Supabase or Currents (guest + evergreen/seed content).

---

## App constants (`src/constants/config.ts`)

### `APP_NAME`

```typescript
export const APP_NAME = 'CareMate';
```

### `STORAGE_KEYS`

| Key | SecureStore key | Purpose |
|-----|-----------------|---------|
| `ONBOARDING_COMPLETE` | `onboarding_complete` | Skip onboarding flag |
| `BIOMETRIC_ENABLED` | `biometric_enabled` | Biometric unlock preference |

### `SYNC_CONFIG`

| Setting | Value | Purpose |
|---------|-------|---------|
| `maxRetries` | 5 | Max sync queue retry attempts |
| `retryDelayMs` | 2000 | Delay between retries |
| `pullIntervalMs` | 60000 | Open-app safety interval (1 min) |
| `writeDebounceMs` | 1500 | Coalesce bursts of local writes into one push |

### `QUERY_KEYS`

TanStack Query cache keys for articles, providers, profile, emergency, bookmarks, settings. Use these constants — do not inline string keys.

---

## Guest constants (`src/constants/guest.ts`)

```typescript
export const GUEST_USER_ID = 'guest';
export const GUEST_USER = { id: 'guest', email: 'guest@caremate.local', ... };
```

---

## Assets (`src/constants/assets.ts`)

Centralized `require()` paths for images used in home and branding.

---

## `app.json`

Expo configuration at project root.

| Field | Value |
|-------|-------|
| `name` | CareMate |
| `slug` | caremate |
| `version` | 1.0.0 |
| `scheme` | caremate (deep links) |
| `orientation` | portrait |
| `userInterfaceStyle` | automatic |

### iOS

| Field | Value |
|-------|-------|
| `bundleIdentifier` | com.softlyft.caremate |
| `icon` | ./assets/expo.icon |

### Android

| Field | Value |
|-------|-------|
| `package` | com.softlyft.caremate |
| `adaptiveIcon.foregroundImage` | ./assets/images/caremate-logo.png |
| `adaptiveIcon.backgroundColor` | #FFFFFF |

### Web

| Field | Value |
|-------|-------|
| `bundler` | metro |
| `output` | static |

### Plugins

| Plugin | Config |
|--------|--------|
| `expo-router` | COOP/COEP headers for web |
| `expo-sqlite` | — |
| `expo-secure-store` | — |
| `expo-splash-screen` | White bg, `caremate-splash-icon.png`, width 160 |
| `expo-local-authentication` | Face ID permission string |

### Experiments

| Flag | Effect |
|------|--------|
| `typedRoutes: true` | Generated route types in `.expo/types/` |
| `reactCompiler: true` | React Compiler enabled |

---

## Drizzle (`drizzle.config.ts`)

```typescript
schema: './src/database/schema.ts'
out: './src/database/migrations'
dialect: 'sqlite'
driver: 'expo'
```

After changing `src/database/schema.ts`, run `npm run db:generate` and commit the new files under `src/database/migrations/`. Metro bundles `.sql` via `sourceExts` + `babel-plugin-inline-import`.

---

## Metro (`metro.config.js`)

- Uniwind CSS processing with `global.css` as cssEntryFile
- `expo-sqlite` WASM support for web
- COOP/COEP headers for SharedArrayBuffer on web

---

## TypeScript (`tsconfig.json`)

- Strict mode enabled
- Path aliases: `@/*` → `./src/*`, `@/assets/*` → `./assets/*`
- Extends Expo base tsconfig

---

## ESLint (`eslint.config.js`)

Uses `eslint-config-expo`. Run via `npm run lint`.

## Prettier (`.prettierrc`)

`npm run format` checks; `npm run format:write` applies. Docs/assets/supabase are ignored (see `.prettierignore`).

## Jest (`package.json` → `jest`)

Preset `jest-expo`. Path alias `@/` mapped. Run via `npm run test`.

## GitHub Actions

- `.github/workflows/ci.yml` — format, lint, typecheck, test on PRs
- `.github/workflows/eas-test-release.yml` — same gate, then EAS builds

---

## Gluestack (`gluestack-ui.config.json`)

Gluestack UI project configuration for component generation CLI.

---

## Supabase setup (production)

Project: **caremate-dev** (`eybakmhqtotoywwgwgjy`), linked via Supabase CLI.

1. Create / use Supabase project and put URL + anon key in `.env`
2. Link CLI (once per machine, from ecosystem root): `npm run supabase:link`
3. Add SQL under ecosystem `supabase/migrations/` (`npm run supabase:migration:new <name>`)
4. Apply to remote: `npm run supabase:db:push`
5. Enable **Row Level Security** on all user tables (included in migrations)
6. Configure Auth providers (email minimum)
7. Auth → URL Configuration → Redirect URLs: allowlist `caremate://auth/reset-password` (and the Expo Go / dev `Linking.createURL` value shown on the forgot-password screen in `__DEV__`)

```bash
# Prefer from ecosystem root, or use these proxies from caremate/
npm run supabase:migration:list   # local vs remote
npm run supabase:migration:new -- add_something
npm run supabase:db:push
```

Cloud migrations: `../supabase/migrations/` (shared monorepo folder).

Tables to mirror: `profiles`, `emergency_profiles`, `articles`, `bookmarks`, `providers`, `provider_favorites`, `settings`, `mini_app_snapshots`.

---

## Related docs

- [Getting Started](./getting-started.md) — env setup
- [Data Layer](./data-layer.md) — schema details
- [Authentication](./authentication.md) — Supabase auth
