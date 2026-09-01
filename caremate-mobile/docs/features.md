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
| `HomeHeader` | `features/home/components/HomeHeader.tsx` | Greeting, tagline, notifications |
| `OfflineBanner` | `components/OfflineBanner.tsx` | Connectivity status |
| `HomeSearchBar` | `features/home/components/HomeSearchBar.tsx` | Opens global search |
| `DailyHealthTip` | `features/home/components/DailyHealthTip.tsx` | Rotating tip from `health_tips` |
| `AdSlot` (`home.tips`) | `features/ads/AdSlot.tsx` | Banner after tip |
| `HealthCategoriesRow` | `features/home/components/HealthCategoriesRow.tsx` | Learn categories |
| `FeaturedArticles` | `features/home/components/FeaturedArticles.tsx` | Trending: 1 CareMate evergreen + 2 INT news + up to 2 country news |
| `AdSlot` (`home.feed`) | `features/ads/AdSlot.tsx` | Banner after featured |
| `NearbyProvidersRow` | `features/home/components/NearbyProvidersRow.tsx` | Nearby providers preview. Falls back to cached providers when location is unavailable; if there is no cache either, shows a gradient "enable location" card whose CTA requests precise location in place |
| `EmergencyBanner` | `features/home/components/EmergencyBanner.tsx` | Emergency profile CTA |

Spacing between Home sections follows the shared **~16px** rhythm — see [UI & Theme](./ui-and-theme.md#tab-spacing-rhythm). Ads: [Ads](./ads.md).

`QuickActionsGrid` exists in `features/home/components/QuickActionsGrid.tsx` but is not currently mounted on Home.

### Data loading

| Query | Source | Purpose |
|-------|--------|---------|
| Profile | `profileRepository.findByUserId()` | Country/profile context |
| Articles | `articleRepository.getTrendingToday()` and article queries | Learn content on Home |
| Providers | `providerRepository.findAll()` or nearby cache | Nearby row |
| Health tips | `healthTipRepository` | Daily tip rotation |

External health news is ingested manually in the SoftLyft admin portal (Currents → Supabase). Home/Learn pull the published catalog from Supabase into SQLite and keep only the last **7 calendar days** of external news (`firstSeenAt`). Unpublishing a story in admin removes it from devices on the next sync. Country slots still use `attributes.newsRegions` (INT + NG today).

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
| Learn feed | `/(app)/(tabs)/articles` | Search + category filter; Reading + Bookmarks pills |
| Article detail | `/(app)/articles/[id]` | Body, bookmark, mark-as-read; header/footer ads |
| Category page | `/(app)/articles/category/[slug]` | Alternate category route |
| Bookmarks | `/(app)/articles/bookmarks` | Saved articles |
| Reading history | `/(app)/articles/reading` | Tabs: currently reading + finished |

### Article reading state

- Opening an article marks it **Reading** (unless already **Read**)
- Scroll near the end (~88%) or tap mark-as-read → **Read**
- Tap again to clear / mark unread
- Syncs as `article_reads` when signed in (guest stays local until migrate)

### UX notes

- Category chips are horizontally scrollable; each category has soft tint + **accent** color when selected (same idea as Nearby type filters). “All” uses a grid icon.
- Clearing “All” uses `setParams({ category: '' })` — does not remount the tab.
- Tab stays mounted when switching away ([Navigation](./navigation.md#bottom-tabs)).
- Bookmark and mark-as-read toggles work on Learn cards and article detail.

## Search

**Route:** `/(app)/search`  
**Domain:** `src/domains/search/`  
**Copy:** `domains/localization/translations/*/search.json` (namespace `search`)

Global search combines three sources:

| Section | Source |
|---------|--------|
| Articles | Local article search (`CompactArticleCard`) |
| Providers | `search_providers_by_name` (live catalog) | Nearby / provider cards |
| Tools | Mini-app registry metadata |

### UX

- Custom chrome (`headerShown: false`): glossy teal back button + Learn-style search shell
- Idle state with Articles / Nearby / Tools hint chips; clear control when typing
- Results grouped by section with “See all in Learn / Nearby” deep links (`?q=`)
- Query is deferred (`useDeferredValue`) while searching

Search deep-links users back into Learn or Nearby using route params like `?q=`.

## Nearby Providers

**Route:** `/(app)/(tabs)/providers`  
**Domain:** `src/domains/providers/`

Nearby is no longer driven by seeded bundle data as the primary source. The current implementation is:

1. Resolve coords via fresh GPS (capture + last-20 history) or last known sample
2. Query the `nearby_providers` Supabase RPC when online (max 15)
3. Cache returned rows into SQLite
4. Fall back to local cached provider rows when offline or when the RPC fails
5. Name search uses `search_providers_by_name` (live CareMate catalog, no coordinates)

### Important implementation details

- Source of truth is Supabase via `nearby_providers` / `search_providers_by_name`; local SQLite is a cache of the last geo page plus favorites
- `providerRepository.purgeBundledProviders()` removes legacy bundled/demo rows during bootstrap (there is no `seedIfEmpty()`)
- When location is off and no sample exists, Nearby shows enable-location empty state (or search by name)
- When location is off but a prior sample exists, Nearby uses last known coords and shows a compact enable prompt
- Copy frames results as CareMate providers (in-app catalog)
- Provider detail opens the address in the device’s default maps app (Apple Maps / Google Maps / geo intent) — there is no in-app map SDK
- Favorites are toggled on the provider detail screen and sync through `provider_favorites`
- **Connect with provider** appears on detail only when the catalog org is claim-verified (`is_provider_org_verified`); managed under Me → Connections — see [Provider model](./provider-model.md#provider-portal-engagement) and [Provider Portal connections](../../caremate-provider-portal/docs/connections.md)
- Coordinates for ranking come from live GPS (precise mode) or the user’s last known sample — see [Provider model → Geo strategy](./provider-model.md#geo-strategy-nearby-coordinates)

### Related screens

| Screen | Route | Notes |
|--------|-------|-------|
| Nearby tab | `/(app)/(tabs)/providers` | Horizontal type chips with icons + search; `nearby.list` ad |
| Provider detail | `/(app)/providers/[id]` | Favorite, Connect (verified orgs), contact, `nearby.provider` ad |
| Connections | `/(app)/providers/connections/*` | Me → Connections: approved list + inbound requests |
| Messages | `/(app)/messages/*` | Home → Messages: clinic + insurer threads and DMs |
| Map (legacy) | `/(app)/providers/map` | Redirects to the Nearby tab |

### UX notes

- Provider type filters scroll horizontally (do not wrap); each type uses its theme color + Lucide icon.
- Tab stays mounted when switching away ([Navigation](./navigation.md#bottom-tabs)).

### Current limitations

- Offline fresh installs stay empty until a successful online nearby fetch caches results
- Open in Maps needs an address or coordinates on the provider row

## Apps Tab

**Route:** `/(app)/(tabs)/apps`  
**Screen:** `src/app/(app)/(tabs)/apps.tsx`

This tab is the launcher for the six registered mini-apps:

- Vitals
- Medication Assistant
- Checkup Planner
- Immunization Tracker
- Pregnancy Tracker
- Period Tracker

Card grid uses tightened spacing (`spacing.sm` between cards) — see [UI & Theme](./ui-and-theme.md#tab-spacing-rhythm).

See [Mini-Apps](./mini-apps.md) for the mini-app platform and route structure.

## Profile, Settings, and Premium

**Profile route:** `/(app)/(tabs)/profile`  
**Edit profile:** `/(app)/profile/edit`  
**Settings route:** `/(app)/profile/settings`  
**Premium route:** `/(app)/profile/premium`

Plan tiers, mini-app limits, family caps, and guest vs patient account rules: **[Premium & plans](./premium-and-plans.md)** (product spec; **enforced** in app).

### Implemented profile features

- Guest vs authenticated profile presentation
- Register/sign-in CTAs for guests
- Sign out
- Edit profile (identity fields, NIN for NG, health-practitioner declaration)
- Patient ID display
- Settings access
- Emergency and family entry points
- Premium status and checkout entry points
- Connections / Documents menu rows
- Health Insurance Directory (Me → menu) — payer catalog + connect / disconnect

### Health Insurance Directory

**Routes:** `/(app)/profile/insurance`, `/(app)/profile/insurance/[id]`  
**Domain:** `src/domains/payers/`

Patients discover SoftLyft-seeded insurers via the public `payer_directory` view (claim email hidden). This is **not** the Nearby `insurance` provider type.

| Capability | Behavior |
|------------|----------|
| Browse / search | Paginated directory; detail shows contact fields |
| Connect | Signed-in only; **Connect with insurer** only when the payer is claim-verified (`is_payer_org_verified`) or a connection row already exists |
| Inbound requests | Directory header lists payer-initiated pending; Approve / Decline (+ reason on detail) |
| Connected list | **Your connected insurers** with **Disconnect** (confirm → `disconnect_patient_payer_connection`) |
| Detail lifecycle | Pending outbound cancel; approved disconnect (optional reason); rejected is final |

Full rules: [Provider Portal connections — Patient ↔ payer](../../caremate-provider-portal/docs/connections.md#patient--payer-connections).

### Implemented settings features

- Theme preference (light, dark, system)
- Notifications preference (gates Expo push token registration for Messages and other product push)
- Region and location-related profile fields
- Privacy policy and terms of service links (`LEGAL_URLS`)
- In-app account deletion (signed-in; cloud erase + local wipe) — [Account deletion](./account-deletion.md)

### Current limitations

- Biometric unlock UI is hidden until an app-lock gate is implemented (`authenticateWithBiometrics` exists but is unused)
- Medication / checkup OS push reminders are not fully wired; **Messages** org/direct push via `notify-message` is shipped when the device is registered
- Hosted CareMate privacy/terms pages live in `caremate-website/` (deploy to `getcaremate.com` before store submission)
- Premium tier detection, AdMob suppression, mini-app account gate, usage caps, blur paywalls, and family profile limits are enforced — see [Premium & plans](./premium-and-plans.md)

## Emergency Profile

Emergency profile data is intended to be available offline in the app. Lock Screen / Home Screen widgets no longer show PHI.

### Screens

| Route | Purpose |
|-------|---------|
| `/(app)/emergency` | View emergency profile |
| `/(app)/emergency/edit` | Create / edit |
| `/(app)/emergency/qr` | Redirects to Me → Patient ID card (QR on card back) |
| `/emergency/share/[token]` | Practitioner + sign-in gated view of another user’s emergency (from QR) |

### Lock and widget surface

- Widgets are retired: `syncEmergencyLockSurface` always clears native widgets / AsyncStorage
- Legacy `caremate://emergency-lock` shows a retirement notice pointing to Patient ID QR
- Expo Go: widget updates remain stubbed

### Patient ID QR (share)

- Account required to generate Patient ID + opaque `emergency_share_token`
- QR encodes `caremate://emergency/share/<token>` only (no PHI in the barcode)
- Scanner / OS camera opens CareMate; viewer must be signed in (not guest)
- Server RPC `get_emergency_by_share_token` returns a narrow emergency card for signed-in health practitioners (or Care Portal provider staff / SoftLyft staff)

### Editable data

- Full name
- Blood group and genotype
- Allergies, medications, chronic conditions
- ICE contacts
- Preferred hospital
- Insurance provider
- Notes

`photoUrl` exists in schema but is not exposed in the current edit flow.

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
