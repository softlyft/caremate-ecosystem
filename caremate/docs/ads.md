# Advertising strategy

[← Back to index](./README.md)

> **Status:** Per-slot banner ads shipped — house, sponsored (verified advertisers), and native AdMob. Admin picks **one source per slot** (`off | house | sponsored | admob`); there is **no cross-source fallback**.  
> Kill switches and campaign ops live in **caremate-portal** (`/dashboard/ads`), not in the mobile app.

## Decisions (locked)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Model | **One ad system, three sources** — house, sponsored, AdMob — each slot uses exactly one admin-selected source. |
| 2 | Per-slot mode | `off` → nothing · `house` → best eligible house banner or nothing · `sponsored` → best eligible verified-sponsor banner or nothing · `admob` → AdMob adaptive banner or nothing (free/guest + online + consent). |
| 3 | No fallback | If the selected source has no inventory or fails (e.g. AdMob load error), the slot stays **empty**. No waterfall. |
| 4 | Kill switches | Portal `ads.enabled` master switch + per-slot `ads.slots.<id>.mode`. Mobile reads synced remote config. |
| 5 | Offline | House + sponsored campaigns **sync into SQLite** and render offline. AdMob requires network and is skipped offline. |
| 6 | Premium | **AdMob-free** via entitlement. House and sponsored still allowed unless a future ads-free SKU is added. |
| 7 | Guests | May see house, sponsored, and AdMob per slot mode (subject to consent for AdMob). |
| 8 | Consent | Google UMP via `react-native-google-mobile-ads`; non-personalized by default. Never pass health signals into ad requests. |
| 9 | Kids / family | **No AdMob** on kid-related surfaces or when the active profile is a child (hard blocklist). |
| 10 | Labeling | Sponsored creative always shows **Sponsored**. House may use softer “From CareMate” labeling. |
| 11 | Build | AdMob requires a **dev client / EAS build** (not Expo Go). Store data-safety declarations must list ads. |
| 12 | Frequency caps | Counted **per campaign + slot** per local day (not campaign-global), so one campaign on many slots is not exhausted by Home alone. |
| 13 | Catalog sync | Ad catalog pulls at **app bootstrap** (with articles/tips) and via sync handler `ad_catalog`, then invalidates TanStack Query `ads` keys. |

---

## Tiers

| Tier | Source | Who pays | Role |
|------|--------|----------|------|
| **1 — House** | CareMate | Free | Feature promos, health campaigns, educational CTAs. |
| **2 — Sponsored** | Verified hospitals, pharmacies, labs, NGOs, HMOs, public-health orgs | Paid | Requires verified `ad_advertisers` row linked on campaign. |
| **3 — AdMob** | Google AdMob | Network fill | Only when slot mode is `admob` and user is free/guest with consent + connectivity. |

---

## Slots (v1 placements)

| Slot id | Surface | Default seed mode |
|---------|---------|-------------------|
| `home.tips` | Home — after daily health tip | `house` |
| `home.feed` | Home — after featured articles (before nearby) | `house` |
| `learn.list` | Learn tab — after featured article, before “All topics” | `house` |
| `learn.article_header` | Article detail — immediately before body card | `house` |
| `learn.article_footer` | Article detail — immediately after body card (before Read full CTA on news) | `house` |
| `nearby.list` | Nearby list — after type filters | `house` |
| `nearby.provider` | Provider detail — before contact card | `house` |

Slots are registered in mobile (`AD_SLOTS` in `src/domains/ads/types.ts`) and portal (`caremate-portal/src/domains/ads/constants.ts`). **Source per slot** comes from portal remote config (`ads.slots.<id>.mode`).

### Hard blocklist — no ads ever

| Surface | Reason |
|---------|--------|
| Emergency profile / QR / lock-screen emergency | Safety-critical |
| Period Tracker (all screens) | Sensitive reproductive health |
| Pregnancy Tracker (all screens) | Sensitive reproductive health |
| Active **child** profile contexts | Play Families / kids-policy risk |
| Auth, onboarding, password recovery | Conversion / trust |

Portal cannot override the hard blocklist.

---

## Mobile implementation

| Piece | Path |
|-------|------|
| Types / defaults | `src/domains/ads/types.ts` |
| Resolver | `src/domains/ads/resolver.ts` |
| Repository (SQLite + pull/push) | `src/domains/ads/repository.ts` |
| Hook | `src/domains/ads/hooks.ts` → `useAdForSlot` |
| Consent / UMP | `src/domains/ads/consent.ts` |
| AdMob unit IDs | `src/domains/ads/admob-config.ts` |
| Slot UI | `src/features/ads/AdSlot.tsx` (catalog) · `AdMobBanner.tsx` |
| Unit tests | `src/domains/ads/__tests__/resolver.test.ts` |
| Plugin / app IDs | `app.config.ts` + `react-native-google-mobile-ads` |

### Catalog banner UI

House and sponsored creatives render as gradient promo cards (blue palette): soft wash, accent bar, “Ad · …” badge pill, optional thumbnail / icon, solid CTA. AdMob banners sit in a matching rounded shell.

### Empty slots

`AdSlot` returns `null` when the resolver finds nothing — no placeholder, no fallback creative.

---

## Resolution (per slot request)

```
Slot requested
  → Hard blocklist?                    → render nothing
  → Portal: ads.enabled off?           → nothing
  → Portal: slot mode off?             → nothing
  → mode house                         → eligible house catalog or nothing
  → mode sponsored                     → eligible sponsored + verified advertiser or nothing
  → mode admob
       → Premium signed-in?            → nothing (AdMob-free)
       → offline / no consent / no unit id? → nothing
       → AdMob adaptive banner         → load failure → nothing
```

**Frequency caps** (house + sponsored): `countImpressionsToday(campaignId, slotId)` vs `frequency_cap_per_day`. Welcome house campaign is seeded with cap `4` **per slot**.

**Eligibility:** active campaign, placement for that `slot_id`, in-date window, country allow-list (if set), sponsored requires **verified** advertiser.

---

## Sync & bootstrap

1. **Cold start:** `AppProviders` pulls `adsRepository.pullFromRemote()` alongside articles and health tips, then invalidates `QUERY_KEYS.ads`.
2. **Background:** sync handler `ad_catalog` pulls config, advertisers, campaigns, creatives, placements.
3. **Events:** impressions/clicks write local `ad_events` and enqueue `ad_events` for push.

If a slot looks empty after a portal/migration change, force sync or restart so SQLite picks up new placements and modes.

---

## Admin portal (`/dashboard/ads`)

| Control | Key / table | Effect |
|---------|-------------|--------|
| Master switch | `ads.enabled` | All ad UI off |
| Per-slot source | `ads.slots.<id>.mode` | `off` \| `house` \| `sponsored` \| `admob` |
| House campaigns | `ad_campaigns` (`source = house`) | CRUD + placements |
| Sponsored campaigns | `ad_campaigns` (`source = sponsored`) | Requires verified advertiser |
| Advertisers | `ad_advertisers` | Register (staff); verify/reject (admin only) |

Shared slot id list lives in `caremate-portal/src/domains/ads/constants.ts` (not in `"use server"` action files — Next.js forbids non-async exports there).

Reporting separates events by `source` (`house`, `sponsored`, `admob`).

---

## Data model

**Cloud (Supabase):** `ad_remote_config`, `ad_advertisers`, `ad_campaigns`, `ad_creatives`, `ad_placements`, `ad_events` (nullable campaign/creative for AdMob; `ad_unit_id`).

**SQLite (mobile):** mirrored catalog + local event outbox. AdMob has no creative cache. Drizzle migrations `0002` + `0003`.

### Supabase migrations (order)

| Migration | Purpose |
|-----------|---------|
| `20260716180000_ads_phase1.sql` | Tables, RLS, welcome house campaign + placements for `home.feed`, `learn.list`, `nearby.list` |
| `20260716190000_ads_slot_modes_sponsors.sql` | Slot modes, advertisers, nullable AdMob events |
| `20260716193000_ads_home_tips_slot.sql` | `home.tips` mode + welcome placement |
| `20260716194500_ads_article_header_slot.sql` | `learn.article_header` |
| `20260716200000_ads_nearby_provider_slot.sql` | `nearby.provider` |
| `20260716203000_ads_article_footer_slot.sql` | `learn.article_footer` |

Seed campaign id: `camp_house_welcome` (creative `cre_house_welcome`). New slots need both a **mode** row and a **placement** row or house mode will show nothing.

---

## AdMob configuration

Environment variables (see [Configuration](./configuration.md) and `.env.example`):

- `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID` / `EXPO_PUBLIC_ADMOB_APP_ID_IOS` — wired via `app.config.ts` (must run `npx expo prebuild` so the native manifest gets `APPLICATION_ID`)
- `EXPO_PUBLIC_ADMOB_BANNER_<SLOT>` — one production unit per slot

Pinned package: `react-native-google-mobile-ads@16.0.0` (compatible with Expo 57 / Kotlin 2.1). `__DEV__` builds use Google test banner IDs. Rebuild the native app after changing AdMob config.

---

## Premium interplay

| Entitlement | Ads behavior |
|-------------|--------------|
| Free / guest | Full resolver per slot mode |
| Premium | **No AdMob**; house + sponsored still allowed per slot mode |

---

## Troubleshooting empty slots

| Symptom | Likely cause |
|---------|--------------|
| Article header/footer or provider ad missing | Placement not seeded / not synced to device |
| Ads vanish after browsing Home | Older bug: campaign-global cap — fixed; ensure build includes per-slot caps |
| Portal `/dashboard/ads` 500 | `"use server"` file exporting non-async constants — keep constants in `constants.ts` |
| AdMob crash on Android | Missing AdMob app ID in native manifest — re-run prebuild |
| Slot mode house but nothing shows | No active campaign with a placement for that `slot_id` |

---

## Related

| Doc / area | Link |
|------------|------|
| Env / AdMob IDs | [Configuration](./configuration.md) |
| Layout spacing (Home/Learn/Nearby) | [UI & Theme](./ui-and-theme.md#tab-spacing-rhythm) |
| Tab persistence | [Navigation](./navigation.md#bottom-tabs) |
| Premium / entitlements | [Features](./features.md) |
| Offline sync | [Sync Engine](./SYNC_ENGINE.md) |
| Admin portal | `caremate-portal/docs/` |
| QA cases | [QA Test Cases](./qa-test-cases.md) (Ads section) |
| Roadmap | [Roadmap](./roadmap.md) |
