# Core Features

[← Back to index](./README.md)

## Overview

Core CareMate features use the **repository + SQLite** stack (with optional Supabase sync). Screens live under `src/app/`; feature UI and data helpers live under `src/features/` (`home`, `learn`, `nearby`, `emergency`).

---

## Home tab

**Route:** `/(app)/(tabs)/`  
**File:** `src/app/(app)/(tabs)/index.tsx`

Home is **offline-first**: it renders from SQLite immediately and refreshes Currents news in the background.

### Data loaded

| Query | Source | Purpose |
|-------|--------|---------|
| Profile | `profileRepository.findByUserId` | Country code for news (signed-in only) |
| Trending articles | `articleRepository.getTrendingToday(3, …)` | “Trending Today” row |
| Providers | `providerRepository.findAll()` | Nearby row (first 4 by distance) |

After local trending loads, Home calls `articleRepository.refreshTrendingInBackground({ isGuest, countryCode })` and invalidates `QUERY_KEYS.trendingArticles`.

### Component stack (top → bottom)

| Component | File | Description |
|-----------|------|-------------|
| `HomeHeader` | `features/home/components/HomeHeader.tsx` | Logo, greeting |
| `OfflineBanner` | `components/OfflineBanner.tsx` | Shown when offline |
| `HomeSearchBar` | `features/home/components/HomeSearchBar.tsx` | Opens global Search |
| `DailyHealthTip` | `features/home/components/DailyHealthTip.tsx` | Rotating tip from Supabase → SQLite |
| `HealthCategoriesRow` | `features/home/components/HealthCategoriesRow.tsx` | Category chips → Learn `?category=` |
| `FeaturedArticles` | `features/home/components/FeaturedArticles.tsx` | Trending Today (up to 3) |
| `NearbyProvidersRow` | `features/home/components/NearbyProvidersRow.tsx` | Top 4 providers |
| `EmergencyBanner` | `features/home/components/EmergencyBanner.tsx` | CTA → emergency edit |

`QuickActionsGrid` exists in the codebase but is **not** mounted on Home currently.

### Health categories

Eight categories in `features/home/constants.ts` (`heart`, `child`, `pregnancy`, `mental`, `medication`, `nutrition`, `fitness`, `infectious`). Tapping a chip opens Learn with `/(app)/(tabs)/articles?category=<id>`.

---

## Learn tab (Articles)

**Route:** `/(app)/(tabs)/articles`  
**File:** `src/app/(app)/(tabs)/articles.tsx`  
**Feature code:** `src/domains/articles/`

### Content model

Phase 1 = **articles**. Phase 2 formats (video, podcast, campaign, health alert, FAQ, guide) share one row model — see **[Learn content model](./learn-content-model.md)**.

| Kind | How identified | Source |
|------|----------------|--------|
| Evergreen | CareMate catalog from portal → Supabase (`contentType` article/faq/…) | Pulled into SQLite on boot + sync |
| External (Currents) | `id` starts with `currents-` and/or `sourceUrl` set, `contentType: article` | Currents API → SQLite |
| Health News category | `categoryId === 'health'` | External articles |
| Future formats | `contentType` ≠ `article` + `attributes` | Seeds / CMS / Supabase |

Feed ordering (`orderLearnFeed`): daily featured evergreen → external news → remaining evergreen.

### Offline-first flow

1. Screens read SQLite immediately (`findAll` / `findByCategory` / `getTrendingToday`).
2. Learn and Home kick off `refreshTrendingInBackground` when online and Currents is configured.
3. On success, TanStack Query keys for articles / trending are invalidated.
4. If Currents fails or device is offline, evergreen + previously cached external articles still show.

### Currents integration

| Piece | Location |
|-------|----------|
| Service | `src/services/currents-service.ts` |
| Env | `EXPO_PUBLIC_CURRENTS_API_KEY`, `EXPO_PUBLIC_CURRENTS_COUNTRY` |
| Country resolve | `resolveNewsCountryCode` in `src/constants/locations.ts` |

Country behavior:

- Guest or missing profile country → **INT** (international)
- Signed-in → profile `countryCode` when set
- API: `country` query param is **omitted** for `INT` (Currents returns empty for `INT` / many countries)
- If a country-scoped request returns no news → **fallback to global** English health news

### Learn tab UI

- Search (title / summary / content) — also via Home → **Search** screen
- Category filter via `HealthCategoriesRow` (`?category=` or in-tab state)
- Deep link from Search: `/(app)/(tabs)/articles?q=`
- Unfiltered feed: featured hero (`FeaturedArticleCard`) + compact list
- Link to bookmarks screen
- Background Currents refresh on mount (same as Home)

### Related screens

| Screen | Route | Behavior |
|--------|-------|----------|
| Article detail | `/(app)/articles/[id]` | Full text; **“Read full article”** opens `sourceUrl` in browser when present |
| Category feed | `/(app)/articles/category/[slug]` | Exists; primary UX is tab `?category=` instead |
| Bookmarks | `/(app)/articles/bookmarks` | Lists bookmarked articles |

### Bookmarks (gap)

`articleRepository` supports `toggleBookmark` / `getBookmarks` / sync queue, and the bookmarks screen reads them. **Learn cards and article detail do not call toggle yet** (bookmark icon is decorative). Documented as a known gap.

### Key files

```
domains/articles/
├── components/ArticleCards.tsx
├── utils/evergreen-articles.ts  # feed helpers (CareMate vs Currents)
└── repository.ts
```

---

## Search

**Route:** `/(app)/search`  
**File:** `src/app/(app)/search.tsx`  
**Domain:** `src/domains/search/`

Opened from Home search bar. Queries:

| Section | Source |
|---------|--------|
| Articles | `articleRepository.findAll(query)` (title / summary / content) |
| Nearby | `providerRepository.findAll({ search })` |
| Tools | Mini-app registry name / description |

“See all” deep-links into Learn or Nearby with `?q=`.

---

## Nearby tab (Providers)

**Route:** `/(app)/(tabs)/providers`  
**File:** `src/app/(app)/(tabs)/providers.tsx`  
**Feature code:** `src/domains/providers/`

### Data source

1. **Seed:** FHIR R4 Bundle in `domains/providers/data/providers.json`, mapped by `mapFhirProviderBundle` / `getProviderSeeds()`.
2. `providerRepository.seedIfEmpty()` inserts seeds and soft-deletes legacy ids (`provider-1`…`4`).
3. Optional Supabase pull when sync runs online.

Distances come from seed FHIR extensions (`distanceKm`) — **not** live GPS.

### List UI

- Text search (name / address / phone / type)
- Type filters: All / Hospitals / Clinics / Pharmacies / Labs (`PRIMARY_PROVIDER_TYPES`)
- Deep link from Search: `/(app)/(tabs)/providers?q=`
- Sorted by `distanceKm`
- Opens provider detail; link to “map” screen

Seed data may also include types without filter chips (`dentist`, `mental_health`, `ambulance`, `blood_bank`).

### Related screens

| Screen | Route | Behavior |
|--------|-------|----------|
| Provider detail | `/(app)/providers/[id]` | Contact fields, **favorite toggle** (SQLite + sync), Google Maps directions URL |
| Map | `/(app)/providers/map` | **Coordinate list placeholder** (not `react-native-maps` yet) |

Favorites are toggled on the **detail** screen, not the list.

### Home integration

`NearbyProvidersRow` shows the first 4 providers from `findAll()` (distance-ordered seed data).

### Key files

```
domains/providers/
├── data/providers.json
└── utils/fhir-providers.ts
domains/providers/repository.ts
```

---

## Apps tab

**Route:** `/(app)/(tabs)/apps`  
**File:** `src/app/(app)/(tabs)/apps.tsx`

Mini-apps launcher. See [Mini-Apps](./mini-apps.md).

---

## Me tab (Profile)

**Route:** `/(app)/(tabs)/profile`  
**File:** `src/app/(app)/(tabs)/profile.tsx`

### Features

- Guest vs authenticated display
- Sign-in / create account CTAs for guests (register includes **phone number**)
- Link to settings
- Sign out

### Settings

**Route:** `/(app)/profile/settings`  
**File:** `src/app/(app)/profile/settings.tsx`

- Theme: light / dark / system
- Notifications toggle
- Persisted via settings repository / store

---

## Emergency profile

Critical offline health information for emergencies, plus lock / home screen surfaces.

### In-app routes

| Route | File | Role |
|-------|------|------|
| `/(app)/emergency` | `emergency/index.tsx` | View profile |
| `/(app)/emergency/edit` | `emergency/edit.tsx` | Edit (modal) |
| `/(app)/emergency/qr` | `emergency/qr.tsx` | QR **preview** (payload shown; real QR encoder is a follow-up) |
| `/emergency-lock` | `src/app/emergency-lock.tsx` | Public lock-screen card (no auth) |

Deep link: `caremate://emergency-lock`.

### Fields

Displayed / editable:

- Full name (edit uses first + last)
- Blood group, genotype
- Allergies, medications, chronic conditions (lists)
- Emergency (ICE) contacts — name, phone, relationship
- Preferred hospital, insurance, notes

`photoUrl` exists on the schema but is **not** exposed in the current UI.

### Persistence

- SQLite via `emergencyRepository.save(userId, input)` + sync queue
- On save, also updates lock surface: `setEmergencyLockSurfaceEnabled` + `syncEmergencyLockSurface`

### Lock / widget surface

Minimal snapshot (AsyncStorage + native widget):

| Field | Notes |
|-------|-------|
| Name, blood group, genotype | |
| Allergies | Up to 3 |
| First ICE contact | Name, phone, relationship |

AsyncStorage keys:

| Key | Purpose |
|-----|---------|
| `caremate_emergency_lock_snapshot` | Card JSON |
| `caremate_emergency_lock_enabled` | Opt-out when `'false'` (default on) |

| Platform | Where it appears |
|----------|------------------|
| **iOS** | Lock Screen / Home widgets via `expo-widgets` (`EmergencyLockWidget`) |
| **Android** | Home Screen Glance widget (`modules/emergency-lock-widget`); tap opens `caremate://emergency-lock` |
| **Expo Go** | Native widget updates are stubbed |

Edit screen includes a toggle to show / hide the lock surface. Bootstrap (`AppProviders`) syncs the widget after DB + auth unlock, without blocking UI.

### Home

`EmergencyBanner` → `/(app)/emergency/edit`.

### Key files

```
domains/emergency/
├── lock-surface.ts
└── constants.ts
widgets/EmergencyLockWidget.tsx
widgets/EmergencyLockWidget.impl.tsx   # iOS layout
modules/emergency-lock-widget/         # Android Glance widget
domains/emergency/repository.ts
```

---

## Offline behavior

| Feature | Offline behavior |
|---------|------------------|
| Home feed | ✅ SQLite immediately; Currents refresh skipped |
| Articles / Learn | ✅ Evergreen + cached Currents |
| Providers | ✅ Seeded / cached SQLite |
| Emergency profile | ✅ Full local read/write |
| Lock snapshot / widget | ✅ Local snapshot; widget update best-effort |
| Bookmarks / favorites | ✅ Local + queued for sync |
| Mini-apps | ✅ Fully local |
| Auth (new login) | ❌ Needs network |
| Sync | ⏸ Until online |

---

## Screen state requirements

| State | Component |
|-------|-----------|
| Loading | `LoadingState` |
| Empty | `EmptyState` |
| Error | `ErrorState` |
| Offline | `OfflineBanner` + local data |

Home deliberately avoids a full-screen loader for trending — it shows the shell from cache first.

---

## Related docs

- [Navigation](./navigation.md) — all routes including `/emergency-lock`
- [Data Layer](./data-layer.md) — repositories, seeds, Currents-related methods
- [Configuration](./configuration.md) — Currents + Supabase env
- [Mini-Apps](./mini-apps.md) — Apps tab tools
- [Authentication](./authentication.md) — guest vs signed-in
