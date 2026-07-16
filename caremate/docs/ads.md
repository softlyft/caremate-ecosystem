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

---

## Tiers

| Tier | Source | Who pays | Role |
|------|--------|----------|------|
| **1 — House** | CareMate | Free | Feature promos, health campaigns, educational CTAs. |
| **2 — Sponsored** | Verified hospitals, pharmacies, labs, NGOs, HMOs, public-health orgs | Paid | Requires verified `ad_advertisers` row linked on campaign. |
| **3 — AdMob** | Google AdMob | Network fill | Only when slot mode is `admob` and user is free/guest with consent + connectivity. |

---

## Slots (v1 placements)

| Slot id | Surface |
|---------|---------|
| `home.tips` | Home — after daily health tip |
| `home.feed` | Home — between articles and nearby |
| `learn.list` | Learn tab — after featured, before All topics |
| `learn.article_header` | Article detail — immediately before body card |
| `learn.article_footer` | Article detail — immediately after body card (before Read full CTA on news) |
| `nearby.list` | Nearby results (non-emergency) |
| `nearby.provider` | Provider detail — before contact card |

Slots are registered in mobile code; **source per slot** comes from portal remote config (`ads.slots.<id>.mode`).

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

Frequency caps apply to house + sponsored.

---

## Admin portal (`/dashboard/ads`)

| Control | Key | Effect |
|---------|-----|--------|
| Master switch | `ads.enabled` | All ad UI off |
| Per-slot source | `ads.slots.<id>.mode` | `off` \| `house` \| `sponsored` \| `admob` |
| House campaigns | `ad_campaigns` (`source = house`) | CRUD + placements |
| Sponsored campaigns | `ad_campaigns` (`source = sponsored`) | Requires verified advertiser |
| Advertisers | `ad_advertisers` | Register (staff); verify/reject (admin only) |

Reporting separates events by `source` (`house`, `sponsored`, `admob`).

---

## Data model

**Cloud (Supabase):** `ad_remote_config`, `ad_advertisers`, `ad_campaigns`, `ad_creatives`, `ad_placements`, `ad_events` (nullable campaign/creative for AdMob; `ad_unit_id`).

**SQLite (mobile):** mirrored catalog + local event outbox. AdMob has no creative cache.

Migrations: `supabase/migrations/20260716180000_ads_phase1.sql`, `20260716190000_ads_slot_modes_sponsors.sql`; Drizzle `0002` + `0003`.

---

## AdMob configuration

Environment variables (see [Configuration](./configuration.md) and `.env.example`):

- `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID` / `EXPO_PUBLIC_ADMOB_APP_ID_IOS` — wired via `app.config.ts`
- `EXPO_PUBLIC_ADMOB_BANNER_<SLOT>` — one production unit per slot

`__DEV__` builds use Google test banner IDs. Rebuild native app after changing AdMob config.

---

## Premium interplay

| Entitlement | Ads behavior |
|-------------|--------------|
| Free / guest | Full resolver per slot mode |
| Premium | **No AdMob**; house + sponsored still allowed per slot mode |

---

## Related

| Doc / area | Link |
|------------|------|
| Env / AdMob IDs | [Configuration](./configuration.md) |
| Premium / entitlements | [Features](./features.md) |
| Offline sync | [Sync Engine](./SYNC_ENGINE.md) |
| Admin portal | `caremate-portal/docs/` |
| Roadmap | [Roadmap](./roadmap.md) |
