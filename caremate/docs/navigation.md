# Navigation & Routes

[← Back to index](./README.md)

## Navigator hierarchy

```
Root Stack (src/app/_layout.tsx)
├── index                    → Redirect to /(app)/(tabs)
├── emergency-lock           → Public emergency card (caremate://emergency-lock)
├── auth/reset-password      → New password after email deep link (caremate://auth/reset-password)
├── (auth) Stack             → Onboarding, login, register, forgot-password
└── (app) Stack              → Main app shell
    ├── (tabs) Tab Navigator → 5 bottom tabs
    └── Stack screens        → Detail, modal, mini-app routes
```

Auth group and app group are siblings. There is **no automatic redirect to login** — the app opens directly on Home.

---

## Bottom tabs

Defined in `src/app/(app)/(tabs)/_layout.tsx`.

| Tab label | Route name | File | Icon |
|-----------|------------|------|------|
| Home | `index` | `(tabs)/index.tsx` | Home |
| Learn | `articles` | `(tabs)/articles.tsx` | BookOpen |
| Nearby | `providers` | `(tabs)/providers.tsx` | MapPin |
| Apps | `apps` | `(tabs)/apps.tsx` | LayoutGrid |
| Me | `profile` | `(tabs)/profile.tsx` | UserRound |

Tab bar styling:
- Active tint: `#16A34A` (CareMate green)
- Height: 72px
- Headers hidden at tab level (each screen manages its own layout)

---

## Auth routes

Group: `(auth)` — header hidden.

| Route | Screen | Purpose |
|-------|--------|---------|
| `/(auth)/onboarding` | `onboarding.tsx` | 3-step intro carousel |
| `/(auth)/login` | `login.tsx` | Email/password, demo, guest continue |
| `/(auth)/register` | `register.tsx` | Account creation |
| `/(auth)/forgot-password` | `forgot-password.tsx` | Request password reset email |
| `/auth/reset-password` | `auth/reset-password.tsx` | Set new password after email link |

**Note:** Onboarding exists but is not wired into the root entry flow. Users land on Home without seeing onboarding unless navigated manually.

---

## Core stack routes

Registered in `src/app/(app)/_layout.tsx`. `headerBackButtonDisplayMode: 'minimal'` hides iOS back title text.

### Search

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/search` | card | Search (articles, providers, tools) |

### Emergency

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/emergency` | card | Emergency Profile |
| `/(app)/emergency/edit` | modal | Edit Emergency Profile |
| `/(app)/emergency/qr` | modal | Emergency QR |
| `/emergency-lock` | full screen | Public lock-screen card (root stack) |

### Articles

| Route | Title | Notes |
|-------|-------|-------|
| `/(app)/(tabs)/articles` | Learn | Optional `?category=<id>` and `?q=` |
| `/(app)/articles/[id]` | Article | Optional external `sourceUrl` |
| `/(app)/articles/category/[slug]` | Category | Prefer tab query param for filtering |
| `/(app)/articles/bookmarks` | Bookmarks | List only; toggle UI not wired yet |

### Providers

| Route | Title | Notes |
|-------|-------|-------|
| `/(app)/(tabs)/providers` | Nearby | Type filters + text search; optional `?q=` |
| `/(app)/providers/[id]` | Provider | Favorite toggle lives here |
| `/(app)/providers/map` | Map | Coordinate list placeholder |

### Profile

| Route | Title |
|-------|-------|
| `/(app)/profile/settings` | Settings |

---

## Mini-app routes

### Period Tracker

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/apps/period-tracker` | push | Period Tracker |
| `/(app)/apps/period-tracker/log` | modal | Log Period |

### Pregnancy Tracker

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/apps/pregnancy-tracker` | push | Pregnancy Tracker |
| `/(app)/apps/pregnancy-tracker/setup` | modal | Set Up Pregnancy |
| `/(app)/apps/pregnancy-tracker/log` | modal | Daily Log |

### Immunization Tracker

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/apps/immunization-tracker` | push | Immunization Tracker |
| `/(app)/apps/immunization-tracker/setup` | modal | Family children (redirect) |
| `/(app)/apps/immunization-tracker/log` | modal | Log Vaccine |

### Medication Tracker

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/apps/medication-tracker` | push | Medication Tracker |
| `/(app)/apps/medication-tracker/setup` | modal | Add Medicine |
| `/(app)/apps/medication-tracker/log` | modal | Log Dose |

### Checkup Planner

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/apps/checkup-planner` | push | Checkup Planner |
| `/(app)/apps/checkup-planner/setup` | modal | Set Up Planner |
| `/(app)/apps/checkup-planner/log` | modal | Log Checkup |

Mini-apps are launched from the **Apps** tab via `router.push(app.route)` where `route` comes from `MINI_APPS` in `mini-apps/constants.ts`.

---

## Navigation patterns

### Push to stack screen

```typescript
import { router } from 'expo-router';

router.push('/(app)/emergency/edit');
router.push(`/(app)/articles/${articleId}`);
```

### Push with params

```typescript
router.push({
  pathname: '/(app)/apps/immunization-tracker/log',
  params: { vaccineId: 'bcg' },
});
```

### Go back

```typescript
router.back();
```

### Switch tab

```typescript
router.push('/(app)/(tabs)/articles');
```

---

## Typed routes

`app.json` enables `experiments.typedRoutes: true`. Expo generates `.expo/types/router.d.ts` with href types. Run dev server to regenerate after adding routes.

---

## Deep linking

URL scheme: `caremate://` (from `app.json` → `scheme`).

| Deep link | Screen |
|-----------|--------|
| `caremate://emergency-lock` | Public emergency card |
| `caremate://auth/reset-password` | Password reset (after Supabase email; allowlist in Supabase Redirect URLs) |

Exact Expo Go / dev URIs may use `exp://…/--/auth/reset-password` via `Linking.createURL` — use the value shown on the forgot-password screen in `__DEV__`.

---

## Related docs

- [Core Features](./features.md) — what each screen does
- [Mini-Apps](./mini-apps.md) — mini-app screen details
- [Project Structure](./project-structure.md) — file locations
