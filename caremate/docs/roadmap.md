# Roadmap & Gaps

[← Back to index](./README.md)

## Phase overview

From [`CareMate.md`](../CareMate.md), updated for current shipping scope:

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | MVP — auth, emergency, articles, providers, profile, **5 mini-apps** | ✅ Mostly complete |
| **Phase 2** | Family profiles, appointments, reminders, mini-app SQLite/sync depth | 🔜 Next |
| **Phase 3** | Provider portal, NestJS, FHIR APIs, hospital/lab/pharmacy integrations | ❌ Not started |
| **Phase 4** | Telemedicine, AI, wearables, insurance, **payments (Premium Paystack/Stripe — in progress)** | 🚧 Billing infra started |

### Phase 1 mini-apps (shipped)

| Mini-app | Status |
|----------|--------|
| Medication Tracker | ✅ |
| Checkup Planner | ✅ |
| Immunization Tracker | ✅ (multi-child) |
| Pregnancy Tracker | ✅ |
| Period Tracker | ✅ |

See [Mini-Apps](./mini-apps.md) for routes, storage keys, and feature detail.

---

## MVP success criteria

| Criterion | Status |
|-----------|--------|
| Create account | ✅ Email auth (+ phone on register) |
| Authenticate securely | ✅ Supabase + SecureStore |
| Emergency health profile | ✅ |
| Offline emergency access | ✅ SQLite + lock/home widget surface |
| Browse health articles | ✅ Evergreen + Currents |
| Discover providers | ✅ FHIR-seeded nearby list |
| Offline core features | ✅ |
| Auto sync when online | ✅ When Supabase configured |
| Medication tracking | ✅ Medication Tracker mini-app |
| Vaccination / immunization records | ✅ Immunization Tracker mini-app |
| Preventive checkup planning | ✅ Checkup Planner mini-app |
| Pregnancy & period tools | ✅ Pregnancy + Period mini-apps |

---

## Known gaps (implementation vs intent)

### Architecture

| Gap | Detail | Priority |
|-----|--------|----------|
| Mini-apps bypass SQLite | Was AsyncStorage-only | ✅ Snapshots + Supabase (`mini_app_snapshots`) |
| Drizzle migrations | Generated under `src/database/migrations/`; apply via Expo migrator | — |
| Onboarding first launch | Wired via `app/index.tsx` when incomplete | — |

### Auth

| Gap | Priority |
|-----|----------|
| Phone OTP | Medium |
| Google Sign-In | Medium |
| Apple Sign-In | Medium |
| Auth gate option | Low for core tabs; **mini-app sign-in gate planned** — [Premium & plans](./premium-and-plans.md) |

### Premium & entitlements

Spec: [Premium & plans](./premium-and-plans.md). **Shipped.**

| Feature | Status |
|---------|--------|
| Mini-app sign-in gate | Done |
| Medication 3-med cap (Free) | Done |
| Checkup blur paywall | Done |
| Immunization 2-month blur | Done |
| Pregnancy / Period ad-free (Premium) | Done |
| Family child + spouse limits | Done |
| Shared entitlement helpers + upgrade CTAs | Done |

### Integrations (planned, not in codebase)

| Integration | Phase |
|-------------|-------|
| PostHog analytics | Phase 1+ |
| Sentry error monitoring | Phase 1+ |
| Expo Notifications + FCM | Phase 1+ |
| Ads (per-slot house / sponsored / AdMob) | Shipped — see [Ads](./ads.md); portal `/dashboard/ads`; per-slot frequency caps; bootstrap catalog pull |
| Apple Health / Health Connect | Phase 4 |

### Home screen

| Feature | Status |
|---------|--------|
| Check Symptoms quick action | Not on Home (component unused) |
| Notification bell | UI only (no backend) |
| Search | Global Search screen (`/(app)/search`) across articles, providers, tools |

### Testing & DevOps

| Gap | Status |
|-----|--------|
| Unit / integration tests | Jest + `jest-expo` (seed utils tests) |
| E2E tests | None |
| CI/CD (GitHub Actions) | PR CI (`ci.yml`) + EAS test release |
| EAS Build config | Partial / improve as needed |

---

## Mini-apps roadmap

All five Phase 1 mini-apps ship on AsyncStorage today. Depth / parity work below is Phase 1 polish or Phase 2 depending on sync needs.

### Medication Tracker

| Feature | Status |
|---------|--------|
| Add / edit / pause medicines | ✅ |
| Frequencies (1× / 2× / 3× / as-needed) | ✅ |
| Today dose list + tap to log/undo | ✅ |
| Calendar dose log | ✅ |
| Reminders / notifications | ❌ |
| SQLite + sync | ✅ Snapshot → Supabase |


### Checkup Planner

| Feature | Status |
|---------|--------|
| DOB + gender + optional region | ✅ |
| This year / next year checklist | ✅ |
| Age/gender/region catalog | ✅ |
| Log completions per year | ✅ |
| Expand regional guideline packs | ❌ |
| Clinician export / share | ❌ |
| SQLite + sync | ✅ Snapshot → Supabase |


### Immunization Tracker

| Feature | Status |
|---------|--------|
| Child schedule (19 vaccines) | ✅ |
| Status badges | ✅ |
| Log / update / remove records | ✅ |
| Multiple children profiles | ✅ |
| Adult vaccines | ❌ |
| PDF export for clinic | ❌ |
| Region-specific schedules | ❌ |
| SQLite + sync | ✅ Snapshot → Supabase |


### Pregnancy Tracker

| Feature | Status |
|---------|--------|
| Week/day counter, trimester | ✅ |
| Due date setup | ✅ |
| Daily log (mood, symptoms, kicks) | ✅ |
| Milestones | ✅ Basic |
| Week-by-week baby content | ❌ |
| Appointment reminders | ❌ |
| Weight chart | ❌ |
| Contraction timer | ❌ |
| SQLite + sync | ✅ Snapshot → Supabase |


### Period Tracker → Flo parity

| Feature | Status |
|---------|--------|
| Log period days | ✅ |
| Cycle predictions (fixed 28-day) | ✅ Partial |
| Learned cycle length | ❌ |
| Ovulation / fertile window | ❌ |
| Mood & symptom logging | ❌ |
| Insights dashboard | ❌ |
| Onboarding | ❌ |
| Reminders | ❌ |
| Partner share | ❌ |
| SQLite + sync | ✅ Snapshot → Supabase |


### Mini-apps → SQLite / Supabase

Shipped as **JSON snapshots** (not fully normalized tables yet):

1. Local table `mini_app_snapshots` + repository
2. Zustand persist storage mirrors signed-in writes into SQLite + `sync_queue`
3. Supabase table + RLS: from ecosystem root `npm run supabase:db:push` (see `../supabase/migrations/`)
4. Existing AsyncStorage data migrates on next signed-in sync

Later (optional): normalize into per-entity tables for family sharing / clinician export.

---

## Phase 2 planned features

| Feature | Notes |
|---------|-------|
| Family profiles | `features/family/` placeholder; share mini-app data across members |
| Appointment scheduling | Clinic visits tied to Checkup / Immunization |
| Learn formats (video, podcast, campaign, alert, FAQ, guide) | Same content row + `contentType` — [learn-content-model.md](./learn-content-model.md) |
| Medical documents | Upload / store records |
| Reminder engine | `features/notifications/` placeholder; meds + checkups |
| Mini-app SQLite + cloud backup | ✅ Snapshot sync for all five mini-apps |

| Bookmark toggle UI | Repo ready; Learn cards not wired yet |
| Real provider map | Replace coordinate list with maps SDK |
| Emergency / Patient ID QR | Done — QR renders on Patient ID card back |

---

## Phase 3 planned features

- Provider portal
- NestJS integration service
- FHIR resource mapping
- Hospital / laboratory / pharmacy APIs
- Consent management

---

## Phase 4 planned features

- Telemedicine
- AI health assistant
- Apple Health / Health Connect sync
- Insurance integration
- Payments
- Wearables

---

## CareMate competitive advantages to build on

| Advantage | How to leverage |
|-------------|-----------------|
| Offline-first | Market in low-connectivity regions |
| Guest access | No login wall for health literacy content |
| Emergency profile + widgets | First responder / lock-screen use case |
| Provider discovery | Local hospital/pharmacy finder |
| Mini-app platform | Five tools without app-store fragmentation |
| Unified health shell | Articles + tools + emergency in one app |

---

## Suggested next engineering priorities

1. **Migrate mini-apps to SQLite** for consistency + backup
2. **Add push notification scaffold** (Expo Notifications) for meds / checkups
3. **Period tracker depth** — cycle history engine + ovulation
4. **CI pipeline** — format + lint + typecheck + test (`.github/workflows/ci.yml`)
5. **EAS Build** configuration for TestFlight / Play Internal
6. **Wire article bookmark toggle** and real emergency QR

---

## Documentation maintenance

Update these docs when you:
- Add a route → [Navigation](./navigation.md)
- Add a table → [Data Layer](./data-layer.md)
- Add a mini-app → [Mini-Apps](./mini-apps.md) + [README](./README.md)
- Change env vars → [Configuration](./configuration.md)
- Ship a phase milestone → this file

---

## Related docs

- [Overview](./overview.md) — product vision
- [Architecture](./architecture.md) — current system design
- [Mini-Apps](./mini-apps.md) — Phase 1 tools in detail
- [CareMate.md](../CareMate.md) — original engineering specification
