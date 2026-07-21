# Overview

[← Back to index](./README.md)

## What is CareMate?

CareMate is a **mobile-first healthcare application** designed for patients. It helps users manage critical health information, discover care providers, read trusted health content, and use standalone health tools — all with a strong emphasis on **working without internet**.

The product is built by Softlyft. The iOS bundle ID is `com.softlyft.caremate`; the Android package matches.

---

## Product goals

1. **Patient-centric** — Information and tools that help individuals manage their own health journey.
2. **Offline-first** — Core features must work on poor or no connectivity (common in many healthcare contexts).
3. **Guest-friendly** — Users can explore the app without creating an account first.
4. **Extensible** — Architecture supports future hospital integrations, FHIR, telemedicine, and wearables without a rewrite.
5. **Modular tools** — Standalone mini-apps (medication, checkup planner, immunization, pregnancy, period) live inside a unified CareMate shell.

---

## Non-negotiable engineering principles

These come from [`CareMate.md`](../CareMate.md) and govern all implementation decisions.

### Mobile first

The React Native app is the primary product. Web support exists (Expo web) but mobile is the reference experience. See [ADR-001](./adr/001-why-expo.md).

### Offline first

SQLite on the device is the **source of truth**. The UI reads and writes through repositories. Supabase is updated asynchronously by a sync engine. See [ADR-002](./adr/002-why-sqlite.md) and [ADR-003](./adr/003-why-supabase.md).

### Repository pattern

Each domain (profile, emergency, articles, providers) has a repository that abstracts whether data came from local SQLite or remote Supabase. Screens should not contain raw Supabase or SQL calls. See [ADR-005](./adr/005-repository-pattern.md).

### Guest first

Users can explore core features without an account; sign-in unlocks cloud backup and mini-apps. See [ADR-004](./adr/004-guest-first.md) and [Premium & plans](./premium-and-plans.md).

### No custom backend (Phase 1–2)

Use Supabase directly plus Edge Functions for privileged operations. A NestJS integration layer is planned for Phase 3 only.

---

## What ships today (MVP scope)

### Core app (SQLite + sync)

| Feature | Status |
|---------|--------|
| Guest mode + email auth | ✅ |
| Demo sign-in (offline) | ✅ |
| Emergency profile (view, edit, QR) | ✅ |
| Health articles (feed, categories, detail, bookmarks) | ✅ |
| Provider discovery (list, detail, map, favorites) | ✅ |
| Profile & settings (theme, notifications prefs) | ✅ |
| Offline banner & bootstrap error handling | ✅ |
| Background sync to Supabase | ✅ (when configured) |

### Mini-apps (local + signed-in snapshots)

| Mini-app | Status |
|----------|--------|
| Vitals | ✅ MVP |
| Medication Assistant | ✅ MVP |
| Checkup Planner | ✅ MVP |
| Immunization Tracker | ✅ MVP |
| Pregnancy Tracker | ✅ MVP |
| Period Tracker | ✅ MVP |

### Not yet implemented

- Phone / Google / Apple sign-in
- Push notifications (FCM / Expo Notifications)
- Family profiles, household sharing (Phase 2)
- FHIR, telemedicine, wearables (Phase 3–4)

Monitoring: Sentry + PostHog are wired in `src/lib/monitoring` (enable via env — see [Configuration](./configuration.md)).

See [Roadmap & Gaps](./roadmap.md) for the full phase plan.

---

## Tech stack summary

| Layer | Choice |
|-------|--------|
| Runtime | Expo SDK 57, React Native 0.86 |
| Language | TypeScript (strict) |
| Navigation | Expo Router with typed routes |
| UI kit | Gluestack UI v5 + Uniwind (Tailwind) |
| Local database | Expo SQLite + Drizzle ORM |
| Remote backend | Supabase (Auth + PostgreSQL) |
| Auth tokens | Expo SecureStore (native), AsyncStorage fallback (web) |
| UI state | Zustand |
| Async data / cache | TanStack Query |
| Forms | React Hook Form + Zod |
| Icons | Lucide React Native |

---

## User modes

| Mode | Description |
|------|-------------|
| **Guest** | Default on first launch. Can browse articles, providers, mini-apps. `user_id = 'guest'`. |
| **Authenticated** | Supabase email/password session. Profile and emergency data sync. |
| **Demo** | Local demo user when Supabase is not configured. Seeds sample profile data. |

There is **no auth wall** on app entry — the root route redirects straight to the Home tab.

---

## Success criteria (MVP)

From the engineering guide, MVP is complete when users can:

- Create an account and authenticate securely
- Manage an emergency health profile offline
- Access emergency information via QR
- Browse and search health articles
- Discover nearby healthcare providers
- Continue using core features without internet
- Sync data automatically when connectivity returns

Mini-apps extend the product but are not part of the original MVP checklist.

---

## Next steps

- [Getting Started](./getting-started.md) — run the app locally
- [Architecture](./architecture.md) — how layers connect
- [Core Features](./features.md) — screen-by-screen breakdown
