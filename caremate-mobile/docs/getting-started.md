# Getting Started

[← Back to index](./README.md)

## Prerequisites

| Requirement | Version / notes |
|-------------|-----------------|
| Node.js | 18+ recommended |
| npm | Comes with Node |
| Expo Go | For quick device testing (splash may differ from production) |
| iOS Simulator / Android Emulator | For full native experience |
| Xcode / Android Studio | Optional; needed for native builds |

---

## Installation

```bash
# Clone the repository
cd caremate

# Install dependencies
npm install
```

---

## Environment variables

Copy the example env file and add your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | No* | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | No* | Supabase anonymous (public) key |

\*The app runs **without** Supabase — guest mode, demo login, SQLite seed data, and mini-apps all work offline. Configure Supabase to enable real auth and cloud sync.

Values are read in `src/constants/env.ts`. When unset, `isSupabaseConfigured` is `false` and the Supabase client throws on use (no `placeholder.supabase.co` zombie). Call sites that support offline must check `isSupabaseConfigured` first.

---

## Running the app

```bash
# Start Metro bundler
npm start

# Or with cache cleared (recommended after asset/theme changes)
npx expo start --clear

# Platform-specific
npm run ios
npm run android
npm run web
```

### First launch sequence

1. Splash screen (native, configured in `app.json`)
2. Fonts load (Inter family)
3. `AppProviders` bootstrap runs:
   - SQLite database opens (`caremate.db`)
   - Articles and providers seed if empty
   - Auth store initializes (session or guest)
   - Sync engine starts (no-op if offline / no Supabase)
4. App navigates to **Home** tab

If bootstrap fails (common on web SQLite), a retry screen is shown. See [Architecture — Bootstrap](./architecture.md#bootstrap-sequence).

---

## Useful scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `npm start` | Expo dev server |
| `ios` | `npm run ios` | Open iOS simulator |
| `android` | `npm run android` | Open Android emulator |
| `web` | `npm run web` | Web build |
| `typecheck` | `npm run typecheck` | `tsc --noEmit` |
| `lint` | `npm run lint` | ESLint via Expo |
| `format` | `npm run format` | Prettier check (CI) |
| `format:write` | `npm run format:write` | Prettier write |
| `test` | `npm run test` | Jest (`jest-expo`) |
| `db:generate` | `npm run db:generate` | Drizzle Kit migration generate |

---

## Path aliases

Configured in `tsconfig.json`:

| Alias | Maps to |
|-------|---------|
| `@/*` | `./src/*` |
| `@/assets/*` | `./assets/*` |

Example: `import { palette } from '@/theme'`

---

## Project entry points

| File | Role |
|------|------|
| `package.json` → `"main": "expo-router/entry"` | Expo Router bootstrap |
| `src/app/_layout.tsx` | Root layout, fonts, splash, providers |
| `src/app/index.tsx` | Redirects to onboarding when incomplete, otherwise `/(app)/(tabs)` |
| `global.css` | Uniwind / Tailwind theme tokens |
| `metro.config.js` | Uniwind + SQLite WASM for web |

---

## Testing on device

### Expo Go

Fastest for development. Note:

- Splash screen may show app name below the logo (Expo Go behavior)
- Splash image may not match production builds exactly
- Use a **preview or production build** to verify splash and native plugins

### Development build

For full native plugin behavior (SQLite, secure store, biometrics), use EAS Build or a local dev client when ready.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Database startup failed on web | Use iOS/Android; web SQLite is experimental |
| Styles not updating | `npx expo start --clear` |
| Type errors after route changes | Regenerate types; typed routes enabled in `app.json` |
| Supabase auth fails | Check `.env` values; verify project URL and anon key |
| Mini-app data lost | Expected on reinstall; mini-apps use AsyncStorage only |

---

## Next steps

- [Project Structure](./project-structure.md) — where to put new code
- [Development Guide](./development.md) — coding conventions
- [Configuration](./configuration.md) — `app.json` and constants
