# Configuration

[← Back to index](./README.md)

## Environment variables

File: `.env` (copy from `.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `EXPO_PUBLIC_PAYMENT_URL` | Checkout | Hosted payment app base URL |
| `EXPO_PUBLIC_APP_ENV` | No | Environment label for Sentry (`development` / `staging` / `production` / …) |
| `EXPO_PUBLIC_SENTRY_DSN` | Prod monitoring | Sentry DSN; omit to disable crash reporting |
| `EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV` | No | Set `1` to send Sentry events from `__DEV__` (default off) |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | Prod analytics | PostHog project API key; omit to disable analytics |
| `EXPO_PUBLIC_POSTHOG_HOST` | No | PostHog host (default `https://us.i.posthog.com`) |
| `EXPO_PUBLIC_POSTHOG_ENABLE_IN_DEV` | No | Set `1` to send PostHog events from `__DEV__` (default off) |
| `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID` | AdMob builds | Google AdMob Android app ID (`app.config.ts`) |
| `EXPO_PUBLIC_ADMOB_APP_ID_IOS` | AdMob builds | Google AdMob iOS app ID |
| `EXPO_PUBLIC_ADMOB_BANNER_HOME_TIPS` | Production AdMob | Banner unit for `home.tips` |
| `EXPO_PUBLIC_ADMOB_BANNER_HOME_FEED` | Production AdMob | Banner unit for `home.feed` |
| `EXPO_PUBLIC_ADMOB_BANNER_LEARN_LIST` | Production AdMob | Banner unit for `learn.list` |
| `EXPO_PUBLIC_ADMOB_BANNER_LEARN_ARTICLE_HEADER` | Production AdMob | Banner unit for `learn.article_header` |
| `EXPO_PUBLIC_ADMOB_BANNER_LEARN_ARTICLE_FOOTER` | Production AdMob | Banner unit for `learn.article_footer` |
| `EXPO_PUBLIC_ADMOB_BANNER_NEARBY_LIST` | Production AdMob | Banner unit for `nearby.list` |
| `EXPO_PUBLIC_ADMOB_BANNER_NEARBY_PROVIDER` | Production AdMob | Banner unit for `nearby.provider` |
| `EXPO_PUBLIC_ADMOB_BANNER_PREGNANCY_TIMELINE` | Production AdMob | Banner unit for `pregnancy.timeline` |
| `EXPO_PUBLIC_ADMOB_BANNER_PREGNANCY_FOOTER` | Production AdMob | Banner unit for `pregnancy.footer` |
| `EXPO_PUBLIC_ADMOB_BANNER_PERIOD_WEEK` | Production AdMob | Banner unit for `period.week` |
| `EXPO_PUBLIC_ADMOB_BANNER_PERIOD_FOOTER` | Production AdMob | Banner unit for `period.footer` |

`__DEV__` uses Google sample/test IDs regardless of env. AdMob requires a **dev client or EAS build** (not Expo Go). See [Ads](./ads.md).

### Monitoring (Sentry + PostHog)

| Concern | Module | Notes |
|---------|--------|-------|
| Crash / exception reporting | `src/lib/monitoring/sentry.ts` | `initSentry()` in root layout; `ErrorBoundary` + `Sentry.wrap` |
| Product analytics | `src/lib/monitoring/analytics.ts` | `MonitoringProvider` in `AppProviders`; screen views via pathname |
| Offline analytics outbox | `src/lib/monitoring/analytics-queue.ts` | SQLite `analytics_queue`; flush on online / reconnect / PostHog bind |
| Identity | Both | Signed-in users identified; guests reset |

EAS secrets (not `EXPO_PUBLIC_*`): `SENTRY_AUTH_TOKEN`, optionally `SENTRY_ORG` / `SENTRY_PROJECT` for native source-map upload during builds. Set `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_POSTHOG_API_KEY` as EAS env for release profiles.

Read in `src/constants/env.ts` (excerpt):

```typescript
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  // …
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  isSentryConfigured: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  isPostHogConfigured: Boolean(process.env.EXPO_PUBLIC_POSTHOG_API_KEY),
};
```

Only `EXPO_PUBLIC_*` variables are available in the Expo client bundle. The app runs without Supabase, Sentry, or PostHog configured (guest + evergreen content; monitoring no-ops). External news is ingested by the SoftLyft admin portal and synced via Supabase.

---

## App constants (`src/constants/config.ts`)

### `APP_NAME`

```typescript
export const APP_NAME = 'CareMate';
```

### `LEGAL_URLS`

Hosted CareMate legal pages opened from Settings → Legal:

| Key | Default URL |
|-----|-------------|
| `privacy` | `https://caremate.app/privacy` |
| `terms` | `https://caremate.app/terms` |

Source pages live in the monorepo [`caremate-website/`](../../caremate-website/) package. Keep App Store / Play Console listing URLs aligned. Publish the site before relying on these links in production.

### `WEBSITE_URLS`

Public CareMate website surfaces opened from the app (outside Settings legal):

| Key | Default URL | Opened from |
|-----|-------------|-------------|
| `communityNetwork` | `https://caremate.app/ccn` | Me → Join our movement |

Enrollment continues on the Community Portal (`https://community.caremate.app/join`). See [`caremate-website/README.md`](../../caremate-website/README.md) and [`caremate-community-portal/docs`](../../caremate-community-portal/docs/README.md).

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

TanStack Query cache keys for articles, providers, profile, emergency, bookmarks, article reads, settings, ads, family, notifications. Use these constants — do not inline string keys.

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
| `expo-localization` | Added via `app.config.ts` when missing |
| `@sentry/react-native/expo` | Org/project via `SENTRY_ORG` / `SENTRY_PROJECT` (auth token env only) |

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

- Sentry Expo Metro config (`getSentryExpoConfig`) for source maps
- Uniwind CSS processing with `global.css` as cssEntryFile
- `expo-sqlite` WASM support for web
- COOP/COEP headers for SharedArrayBuffer on web
- Monorepo `watchFolders` + `nodeModulesPaths`

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
# Prefer from ecosystem root, or use these proxies from caremate-mobile/
npm run supabase:migration:list   # local vs remote
npm run supabase:migration:new -- add_something
npm run supabase:db:push
```

Cloud migrations: `../supabase/migrations/` (shared monorepo folder).

Tables to mirror: `profiles`, `emergency_profiles`, `articles`, `bookmarks`, `article_reads`, `providers`, `provider_favorites`, `settings`, `mini_app_snapshots`, family tables, `subscription_entitlements`.

---

## Related docs

- [Getting Started](./getting-started.md) — env setup
- [Data Layer](./data-layer.md) — schema details
- [Authentication](./authentication.md) — Supabase auth
