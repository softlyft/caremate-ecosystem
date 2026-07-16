# Core Features

[← Back to index](./README.md)

## Overview

CareMate’s core product features are implemented on top of the mobile app’s local-first repository stack:

```text
UI → Repository → SQLite → Sync Engine → Supabase
```

Core routes live under `src/app/`. Shared feature composition mostly lives under `src/features/`, while domain-specific behavior lives under `src/domains/`.

## Home Tab

**Route:** `/(app)/(tabs)`  
**Screen:** `src/app/(app)/(tabs)/index.tsx`

Home renders from SQLite first, then refreshes remote data where supported.

### Main sections

| Component | File | Purpose |
|-----------|------|---------|
| `HomeHeader` | `features/home/components/HomeHeader.tsx` | Greeting and profile context |
| `OfflineBanner` | `components/OfflineBanner.tsx` | Connectivity status |
| `HomeSearchBar` | `features/home/components/HomeSearchBar.tsx` | Opens global search |
| `DailyHealthTip` | `features/home/components/DailyHealthTip.tsx` | Rotating tip from `health_tips` |
| `HealthCategoriesRow` | `features/home/components/HealthCategoriesRow.tsx` | Learn categories |
| `FeaturedArticles` | `features/home/components/FeaturedArticles.tsx` | Trending/featured articles |
| `NearbyProvidersRow` | `features/home/components/NearbyProvidersRow.tsx` | Nearby providers preview |
| `EmergencyBanner` | `features/home/components/EmergencyBanner.tsx` | Emergency profile CTA |

`QuickActionsGrid` exists in `features/home/components/QuickActionsGrid.tsx` but is not currently mounted on Home.

### Data loading

| Query | Source | Purpose |
|-------|--------|---------|
| Profile | `profileRepository.findByUserId()` | Country/profile context |
| Articles | `articleRepository.getTrendingToday()` and article queries | Learn content on Home |
| Providers | `providerRepository.findAll()` or nearby cache | Nearby row |
| Health tips | `healthTipRepository` | Daily tip rotation |

When online and configured, article refreshes can pull from Currents in the background and invalidate article query keys afterward.

## Learn

**Route:** `/(app)/(tabs)/articles`  
**Domain:** `src/domains/articles/`

Learn combines:

- Evergreen content managed through the portal and synced from Supabase
- Cached external health news from Currents
- Category filtering and search

### Related screens

| Screen | Route | Notes |
|--------|-------|-------|
| Learn feed | `/(app)/(tabs)/articles` | Search + category filter |
| Article detail | `/(app)/articles/[id]` | Full article view; external sources open in browser |
| Category page | `/(app)/articles/category/[slug]` | Alternate category route |
| Bookmarks | `/(app)/articles/bookmarks` | Reads local bookmark rows |

### Current limitation

Bookmarks are only partially wired today:

- `articleRepository.toggleBookmark()` exists
- The bookmarks screen reads bookmarks successfully
- Learn cards and article detail do not yet trigger bookmark toggles, so bookmark icons are currently decorative

## Search

**Route:** `/(app)/search`  
**Domain:** `src/domains/search/`

Global search combines three sources:

| Section | Source |
|---------|--------|
| Articles | Local article search |
| Providers | Local provider cache search |
| Tools | Mini-app registry metadata |

Search deep-links users back into Learn or Nearby using route params like `?q=`.

## Nearby Providers

**Route:** `/(app)/(tabs)/providers`  
**Domain:** `src/domains/providers/`

Nearby is no longer driven by seeded bundle data as the primary source. The current implementation is:

1. Query the `nearby_providers` Supabase RPC when online
2. Cache returned rows into SQLite
3. Fall back to local cached provider rows when offline or when the RPC fails

### Important implementation details

- Source of truth is Supabase via `nearby_providers`; local SQLite is a cache of the last geo page plus favorites
- `providerRepository.purgeBundledProviders()` removes legacy bundled/demo rows during bootstrap (there is no `seedIfEmpty()`)
- When the RPC returns no rows (or the cache is empty offline), Nearby shows an empty state — that is expected
- Provider detail opens the address in the device’s default maps app (Apple Maps / Google Maps / geo intent) — there is no in-app map SDK
- Favorites are toggled on the provider detail screen and sync through `provider_favorites`
- Coordinates for ranking come from live GPS (precise mode) or a **selection-based** approximate pin (country / Nigerian state) — see [Provider model → Geo strategy](./provider-model.md#geo-strategy-nearby-coordinates)

### Related screens

| Screen | Route | Notes |
|--------|-------|-------|
| Nearby tab | `/(app)/(tabs)/providers` | Filters + search; empty state when none nearby |
| Provider detail | `/(app)/providers/[id]` | Favorite toggle, contact info, Open in Maps |
| Map (legacy) | `/(app)/providers/map` | Redirects to the Nearby tab |

### Current limitations

- Offline fresh installs stay empty until a successful online nearby fetch caches results
- Open in Maps needs an address or coordinates on the provider row

## Apps Tab

**Route:** `/(app)/(tabs)/apps`  
**Screen:** `src/app/(app)/(tabs)/apps.tsx`

This tab is the launcher for the five registered mini-apps:

- Period Tracker
- Pregnancy Tracker
- Immunization Tracker
- Medication Tracker
- Checkup Planner

See [Mini-Apps](./mini-apps.md) for the mini-app platform and route structure.

## Profile, Settings, and Premium

**Profile route:** `/(app)/(tabs)/profile`  
**Settings route:** `/(app)/profile/settings`  
**Premium route:** `/(app)/profile/premium`

### Implemented profile features

- Guest vs authenticated profile presentation
- Register/sign-in CTAs for guests
- Sign out
- Patient ID display
- Settings access
- Emergency and family entry points
- Premium status and checkout entry points

### Implemented settings features

- Theme preference (light, dark, system)
- Notifications preference
- Region and location-related profile fields

### Current limitations

- Biometric unlock UI is hidden until an app-lock gate is implemented (`authenticateWithBiometrics` exists but is unused)
- Notifications are preference-only; push delivery and reminder flows are not fully wired
- Premium status is surfaced in the UI, but feature locking is still intentionally limited

## Emergency Profile

Emergency profile data is intended to be available offline and also surfaced through the lock/widget layer.

### Routes

| Route | Purpose |
|-------|---------|
| `/(app)/emergency` | View profile |
| `/(app)/emergency/edit` | Edit profile |
| `/(app)/emergency/qr` | Redirects to Me → Patient ID card (QR on card back) |
| `/emergency-lock` | Public emergency card |

### Editable data

- Full name
- Blood group and genotype
- Allergies, medications, chronic conditions
- ICE contacts
- Preferred hospital
- Insurance provider
- Notes

`photoUrl` exists in schema but is not exposed in the current edit flow.

### Lock and widget surface

- iOS: widget/lock-screen support via `expo-widgets`
- Android: Glance widget module under `modules/emergency-lock-widget`
- Expo Go: widget updates are stubbed

### Current limitations

- QR is currently a payload preview rather than a generated QR image

## Family

Family flows live across:

- `/(app)/family/*`
- `src/domains/family/`
- `src/app/(app)/setup/family-prompt.tsx`

Implemented capabilities include:

- Family setup wizard
- Child profile capture
- Household records
- Spouse/user lookup and connection requests
- Requests review screens

### Current limitations

- Invite links are generated but not fully redeemable through an in-app deep-link flow

See [Family profiles](./family-profiles.md) for the domain-specific flow.

## Onboarding and Setup

CareMate now has:

- A multi-step onboarding flow under `/(auth)/onboarding/*`
- Post-signup setup screens under `/(app)/setup/*`

This onboarding flow is part of the actual entry experience when onboarding has not been completed.

### Current limitations

- Notifications setup is preference-only today

## Offline Behavior Summary

| Feature | Offline behavior |
|---------|------------------|
| Home | Local-first render; remote refresh skipped |
| Learn | Evergreen + cached remote articles |
| Providers | Cached provider rows only |
| Emergency | Full local read/write |
| Family | Local-first data, remote sync when available |
| Mini-apps | Fully local-first with snapshot sync for signed-in users |
| Auth | Existing sessions restore; fresh sign-in requires network |

## Screen States

Common state components:

| State | Component |
|-------|-----------|
| Loading | `LoadingState` |
| Empty | `EmptyState` |
| Error | `ErrorState` |
| Offline | `OfflineBanner` |

Not every screen currently implements all four states consistently; this is one of the active quality gaps in the app.

## Related Docs

- [Navigation](./navigation.md)
- [Authentication](./authentication.md)
- [Data Layer](./data-layer.md)
- [Supabase alignment](./supabase-alignment.md)
- [Provider model](./provider-model.md)
- [Mini-Apps](./mini-apps.md)
