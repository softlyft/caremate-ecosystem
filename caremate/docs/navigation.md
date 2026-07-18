# Navigation & Routes

[← Back to index](./README.md)

## Navigator hierarchy

```
Root Stack (src/app/_layout.tsx)
├── index                    → Redirect based on onboarding/auth state
├── emergency-lock           → Public emergency card (caremate://emergency-lock)
├── auth/reset-password      → New password after email deep link (caremate://auth/reset-password)
├── (auth) Stack             → Onboarding, login, register, forgot-password
└── (app) Stack              → Main app shell
    ├── (tabs) Tab Navigator → 5 bottom tabs
    └── Stack screens        → Detail, modal, mini-app routes
```

Auth group and app group are siblings. The app does not force login first; it uses guest-first access and onboarding state to decide the first route.

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

- Custom floating bar via `components/navigation/CareMateTabBar.tsx`
- Headers hidden at tab level (stack screens provide their own headers)
- Scene inset reserved through `TAB_BAR_SCENE_INSET`
- **`detachInactiveScreens={false}`** and **`freezeOnBlur: true`** so Learn / Nearby / other tabs stay mounted when switching — no remount flash or replay of enter animations
- Learn and Nearby queries use longer `staleTime` and `refetchOnMount: false` so returning to a tab does not feel like a reload
- Full-screen loaders only when there is **no cached data yet**

Learn category filters update via `router.setParams` (including clearing to All) — avoid `router.replace` to the same tab (that remounts the screen).

---

## Auth routes

Group: `(auth)` — header hidden.

| Route | Screen | Purpose |
|-------|--------|---------|
| `/(auth)/onboarding` | `onboarding/index.tsx` | Intro step |
| `/(auth)/onboarding/country` | `country.tsx` | Country + language selection (required); searchable worldwide list; state/province not collected in UI yet |
| `/(auth)/onboarding/priorities` | `priorities.tsx` | User priorities |
| `/(auth)/onboarding/location` | `location.tsx` | Approximate location |
| `/(auth)/onboarding/notifications` | `notifications.tsx` | Notifications preference |
| `/(auth)/onboarding/next` | `next.tsx` | Transition step |
| `/(auth)/login` | `login.tsx` | Email/password, demo, guest continue |
| `/(auth)/register` | `register.tsx` | Account creation |
| `/(auth)/forgot-password` | `forgot-password.tsx` | Request password reset email |
| `/auth/reset-password` | `auth/reset-password.tsx` | Set new password after email link |

**Note:** Onboarding is wired into the root entry flow when onboarding is incomplete.

---

## Core stack routes

Registered in `src/app/(app)/_layout.tsx`. `headerBackButtonDisplayMode: 'minimal'` hides iOS back title text.

### Search

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/search` | card | Search (articles, providers, tools); custom glossy back + search shell |

### Billing deep links

| Route | Notes |
|-------|-------|
| `billing/success` | After Paystack/Stripe (`caremate://billing/success`) |
| `billing/cancel` | Cancelled checkout (`caremate://billing/cancel`) |

### Emergency

| Route | Presentation | Title |
|-------|--------------|-------|
| `/(app)/emergency` | card | Emergency Profile |
| `/(app)/emergency/edit` | modal | Edit Emergency Profile |
| `/(app)/emergency/qr` | modal | Redirect → Me (Patient ID QR on card back) |
| `/emergency-lock` | full screen | Public lock-screen card (root stack) |

### Articles

| Route | Title | Notes |
|-------|-------|-------|
| `/(app)/(tabs)/articles` | Learn | Optional `?category=<id>` and `?q=` |
| `/(app)/articles/[id]` | Article | Optional external `sourceUrl` |
| `/(app)/articles/category/[slug]` | Category | Prefer tab query param for filtering |
| `/(app)/articles/bookmarks` | Bookmarks | Saved articles |
| `/(app)/articles/reading` | Reading history | Reading + Read tabs |

### Providers

| Route | Title | Notes |
|-------|-------|-------|
| `/(app)/(tabs)/providers` | Nearby | Type filters + text search; optional `?q=` |
| `/(app)/providers/[id]` | Provider | Favorite toggle lives here |
| `/(app)/providers/map` | Map (legacy) | Redirects to Nearby tab |

### Profile

| Route | Title |
|-------|-------|
| `/(app)/profile/settings` | Settings |
| `/(app)/profile/premium` | Premium |

### Family and setup

| Route | Title | Notes |
|-------|-------|-------|
| `/(app)/family` | Family | Household overview |
| `/(app)/family/setup` | Family setup | Parent/spouse setup |
| `/(app)/family/kids-count` | Kids | Child count step |
| `/(app)/family/child/[index]` | Child profile | Child detail/edit |
| `/(app)/family/review` | Review family | Review step |
| `/(app)/family/requests` | Requests | Connection requests |
| `/(app)/setup/emergency` | Setup emergency | Post-signup setup |
| `/(app)/setup/family-prompt` | Family prompt | Post-signup setup |
| `/(app)/setup/done` | Done | Setup completion |

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

Mini-apps are launched from the **Apps** tab via the registry in `src/mini-apps/_kit/registry.ts`. Header options live on the nested stack in `src/app/(app)/apps/_layout.tsx` (guest gate + themed title/back). The parent app stack only mounts `apps` with `headerShown: false`.

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
