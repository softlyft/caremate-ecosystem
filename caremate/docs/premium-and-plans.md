# Premium & plans

[← Back to index](./README.md)

> **Status:** Product specification — **enforced in app** (tier detection, gates, caps, blur paywalls, family limits). Run QA cases in [QA Test Cases](./qa-test-cases.md) § Premium.

CareMate separates **who you are** (guest vs patient account) from **what plan you pay for** (Free, Standard Premium, Family Premium). Premium value is concentrated in **mini-apps** and **family household size**; core discovery and safety features stay available without payment.

---

## Terminology

| User-facing name | Code / billing (`PremiumTier`, `PlanType`) | Notes |
|------------------|--------------------------------------------|-------|
| **Guest** | `guest` session (`GUEST_USER_ID`) | No Supabase account; device-local only |
| **Free** | `tier: 'free'` | Signed-in patient account, no active subscription |
| **Standard Premium** | `tier: 'personal'`, `planType: 'personal'` | Individual subscription |
| **Family Premium** | `tier: 'family'`, `planType: 'family'` | Household subscription (shared entitlement) |

Checkout and portal pricing rows use `personal` / `family` plan types. UI copy should say **Standard Premium** and **Family Premium**.

---

## Access model (guest vs patient account)

| Layer | Guest | Patient account (Free or Premium) |
|-------|-------|-----------------------------------|
| Default on first launch | Yes | After register or sign-in |
| Supabase identity | No | Yes |
| Cloud sync / backup | No | Yes |
| Patient ID | Local-only emergency path | Account-scoped |
| Core tabs: Home, Learn, Nearby | Yes | Yes |
| Emergency profile / lock card | Yes | Yes |
| **Mini-apps (Apps tab tools)** | **No — sign in or register required** | Yes (limits vary by plan) |

**Guest-first still applies to core CareMate** — articles, provider search, and emergency tooling remain usable without an account. **Mini-apps are the exception:** opening any tool from the Apps tab requires a patient account (register or sign-in). Guests see a sign-in / create-account prompt instead of the mini-app dashboard.

When a guest creates an account, existing guest-local data migrates per [Authentication](./authentication.md) (`migrateGuestLocalData`, mini-app snapshot migration on sync).

---

## Plans at a glance

| Capability | Free | Standard Premium | Family Premium |
|------------|------|------------------|----------------|
| Price | — | Paid (monthly / yearly) | Paid (monthly / yearly) |
| Patient account + sync | Yes | Yes | Yes |
| Core: Learn, Nearby, Emergency | Full | Full | Full |
| Mini-apps | Free-tier limits (below) | Unlocked limits + ad-free on pregnancy/period | Same as Standard + expanded family |
| **Child profiles in household** | **1 child max** | **1 child max** | **Multiple children** |
| **Spouse connection** | No | No | Up to 3 invited adults (owner-only) |
| AdMob banners | Shown per slot mode (free/guest) | **No AdMob** (existing Premium rule) | **No AdMob** |
| House / sponsored catalog ads | Per portal slot mode | Per slot mode (pregnancy/period ad-free — see below) | Same as Standard |

Family Premium entitlement applies to members linked to the subscribing household (`householdId` on subscription). See [Family profiles](./family-profiles.md).

---

## Core features (not paywalled)

These surfaces are **fully available** to Guest and Free users. Premium does not remove or gate them.

| Feature | Guest | Free | Standard Premium | Family Premium |
|---------|-------|------|------------------|----------------|
| Home (tips, categories, featured) | Yes | Yes | Yes | Yes |
| Learn / articles / news | Yes | Yes | Yes | Yes |
| Bookmarks (local → sync when signed in) | Local | Synced | Synced | Synced |
| Nearby / provider search | Yes | Yes | Yes | Yes |
| Emergency profile (view / edit) | Yes | Yes | Yes | Yes |
| Emergency lock / widget surface | Yes | Yes | Yes | Yes |
| Notifications preference UI | Yes | Yes | Yes | Yes |

---

## Mini-apps entitlement matrix

All mini-apps require a **signed-in patient account**. Limits below apply after sign-in.

| Mini-app | Guest | Free (signed-in) | Standard Premium | Family Premium |
|----------|-------|------------------|------------------|----------------|
| **Vitals** | Blocked (sign-in required) | Full logging; **ads may show** if slots configured later | Full logging; **no ads** | Full logging; **no ads** |
| **Medication Assistant** | Blocked (sign-in required) | **Up to 3 active medications total** (self or assigned to a child) | Unlimited medications | Unlimited medications |
| **Checkup Planner** | Blocked | **This calendar year:** first **2** checkups visible; remaining this year **blurred**. **Next calendar year:** entire schedule **blurred** | Full schedule (all years, no blur) | Full schedule |
| **Immunization Tracker** | Blocked | **First 2 months** of schedule visible; remainder **blurred** | Full schedule (no blur) | Full schedule |
| **Pregnancy Tracker** | Blocked | Full tracking features; **ads may show** in configured slots | Full tracking; **no ads** in pregnancy slots | Full tracking; **no ads** |
| **Period Tracker** | Blocked | Full tracking features; **ads may show** in configured slots | Full tracking; **no ads** in period slots | Full tracking; **no ads** |

### Medication Assistant (detail)

- Count **active medication entries** toward the limit of **3** on Free (create and reactivate).
- Count includes medications logged for **self** or **any child** in the household (one shared cap, not 3 per person).
- At limit: block adding or reactivating another medication; show upgrade CTA to Standard or Family Premium.
- Premium: no medication count cap.
- Reminders in this MVP are **in-app inbox only** (dose due / missed / refill).

### Checkup Planner (detail)

- **Free — current year:** show the first two checkups in chronological order for the active profile; blur later checkups in the same year (overlay + upgrade prompt).
- **Free — future years:** blur the full year (no peek beyond current-year rules).
- **Premium:** render full multi-year schedule with no blur.

### Immunization Tracker (detail)

- Schedule is age/month based; on Free, only the **first two months** of the recommended series are readable.
- Remaining months/items are visible in layout but **blurred** with upgrade CTA.
- Premium: full schedule unlocked.
- Child list comes from family profiles; Free still limited to **one child** (see family table).

### Pregnancy & Period trackers (detail)

- **Feature access is free** for all signed-in users (setup, logging, predictions, timeline).
- **Monetization is ads on Free** (`pregnancy.timeline`, `pregnancy.footer`, `period.week`, `period.footer`) when portal slot mode allows.
- **Standard and Family Premium:** suppress ads on those mini-app slots (house/sponsored may still follow portal mode unless product later makes those ad-free too — default spec: **no ads at all** on pregnancy/period surfaces for Premium).

---

## Family profiles by plan

| Capability | Free | Standard Premium | Family Premium |
|------------|------|------------------|----------------|
| Create household / parent setup | Yes | Yes | Yes |
| Add **one child** | Yes | Yes | Yes |
| Add **additional children** | No — upgrade to Family | No — upgrade to Family | Yes |
| Connect **spouse** to household | No | No | Yes (up to 3 invited adults) |
| Spouse sees shared children / household data | — | — | Yes (when connected) |
| Invite / remove members | — | — | **Owner only** |

Immunization and Medication trackers consume family members from the household. Free + Standard users managing more than one child requires Family Premium.

---

## Ads & Premium interplay

| User | AdMob | House / sponsored (catalog) |
|------|-------|-----------------------------|
| Guest | Per slot (if online + consent) | Per slot |
| Free (signed-in) | Per slot | Per slot |
| Standard / Family Premium | **Never** (resolver returns null for AdMob) | Per portal slot mode globally; **pregnancy & period mini-app slots should render no ads** for Premium |

Full slot list: [Ads](./ads.md). Implementation note: pregnancy/period ad suppression for Premium is part of the planned paywall work even though global AdMob suppression already exists.

---

## Patient account journey

```
First launch → Guest
  → Browse Home / Learn / Nearby / Emergency (no account)
  → Tap Apps tab / mini-app card
       → Sign in or Register (required)
            → Free patient account
                 → Use mini-apps within Free limits
                 → Upgrade → Standard or Family Premium
```

Premium checkout: `/(app)/profile/premium` → hosted **payment** web app → `create-checkout` (pending `payments` row) → Paystack/Stripe → webhook or `verify-checkout` marks payment succeeded and creates/renews an active `subscriptions` row. Portal admins manage prices at `/dashboard/billing` ([Portal billing](../../caremate-portal/docs/billing.md)).

### Checkout currency by country

Currency is chosen from the signed-in member’s **profile country** (device default while browsing as a guest — guests cannot check out), not a manual NGN/USD picker:

| Country | Currency | Gateway |
|---------|----------|---------|
| Nigeria (`NG`) | NGN | Paystack |
| All others (incl. Global / unset) | USD | Stripe |

Overrides live in `caremate/src/domains/billing/currency-by-country.ts` (`BILLING_CURRENCY_BY_COUNTRY` + `DEFAULT_BILLING_CURRENCY`). Add or change a country code there to retarget payments; catalog must still have an active `subscription_prices` row for that currency.

### Standard → Family upgrade

Members with **active Standard** (`personal`) who have a household can upgrade on the Premium screen:

1. App calls `quote-upgrade`. Period day counts use rounded day lengths; credit = `floor(personalPaid × daysRemaining / daysTotal)`.
2. `personalPaid` comes from the linked succeeded payment when present; otherwise the Standard catalog price for that interval/currency.
3. Charge = `max(0, full Family list price − credit)` (not a prorated Family period).
4. `create-upgrade` creates a pending payment and opens Paystack/Stripe directly (not the Vite checkout confirm page). Amount due `0` activates immediately.
5. On success, Standard is canceled and a **new Family period starts today** for the selected monthly/yearly interval. Success/cancel deep links still use the hosted `payment/` return pages.

Active Standard members cannot buy Family via normal `create-checkout`; they must use this upgrade path.

### Offline entitlement

Premium is mirrored into local SQLite (`subscription_entitlements`) after a successful charge / login hydrate.

| Situation | Behavior |
|-----------|----------|
| Device goes offline mid-period | Keep Premium from local cache until `current_period_end` |
| Period ends while offline | Local gate treats plan as Free (no network required) |
| Online again | Sync pull refreshes status / period from Supabase |
| Failed / skipped pull while offline | **Never wipe** the local entitlement cache |

Ads and mini-app limits read the same local gate (`isLocalEntitlementActive`), so AdMob stays suppressed offline for the paid month.

---

## Implementation checklist (engineering)

Use this when wiring code; items are **open** unless marked done.

| Area | Spec | Status |
|------|------|--------|
| Tier detection (`free` / `personal` / `family`) | `src/domains/billing/` | Done |
| Offline Premium until `current_period_end` | `isLocalEntitlementActive` + SQLite cache | Done |
| AdMob hidden for Premium | `resolveAdForSlot` | Done |
| Mini-app gate: require sign-in | `apps/_layout.tsx`, `MiniAppCard` | Done |
| Medication cap (3) on Free | Medication store / UI | Done |
| Checkup blur (2 this year; next year all) | Checkup planner UI | Done |
| Immunization blur (first 2 months) | Immunization UI | Done |
| Pregnancy/period ad-free on Premium | `resolveAdForSlot` + `shouldSuppressAdForUser` | Done |
| Family: 1 child on Free/Standard | Family setup + hub | Done |
| Family: up to 3 adult invites + extra children on Family | Family hub + RPC seat/owner gates | Done |
| Paywall / upgrade CTAs | `UpgradePrompt`, `PremiumLockedOverlay` | Done |
| Standard → Family upgrade (credit + new period) | `quote-upgrade` / `create-upgrade` + Premium screen | Done |
| QA cases | [QA Test Cases](./qa-test-cases.md) § Premium | Ready to run |

Centralize checks in `src/domains/billing/entitlements.ts` (`canAddMedication`, `canAddChild`, etc.) so mini-apps share tier logic.

---

## Related

| Doc | Topic |
|-----|-------|
| [Authentication](./authentication.md) | Guest session, sign-in, migration |
| [Family profiles](./family-profiles.md) | Household, spouse, children |
| [Mini-Apps](./mini-apps.md) | Per-app behavior and routes |
| [Ads](./ads.md) | Slot modes, AdMob, Premium |
| [Features](./features.md) | Core tabs and profile |
| [Roadmap](./roadmap.md) | Delivery phases |
| [Portal billing](../../caremate-portal/docs/billing.md) | Admin pricing & subscribers |
