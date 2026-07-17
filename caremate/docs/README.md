# CareMate Documentation

CareMate is an offline-first, patient-centric mobile healthcare application built with **React Native**, **Expo SDK 57**, and **Supabase**. This documentation describes how the app is structured, how data flows, and how to work on each part of the codebase.

Use this page as the **table of contents**. Each linked document goes deeper on a specific topic.

---

## Quick links

| I want to… | Read |
|------------|------|
| Understand what CareMate is and its goals | [Overview](./overview.md) |
| Set up the project locally | [Getting Started](./getting-started.md) |
| Learn the system architecture | [Architecture](./architecture.md) |
| Read why we chose Expo / SQLite / Supabase / etc. | [ADRs](./adr/README.md) |
| Find where code lives | [Project Structure](./project-structure.md) |
| Understand screens and routes | [Navigation & Routes](./navigation.md) |
| Work on auth, guest mode, biometrics | [Authentication](./authentication.md) |
| Understand Free vs Premium plans & mini-app limits | [Premium & plans](./premium-and-plans.md) |
| Set up kids / spouse household | [Family profiles](./family-profiles.md) · plan limits in [Premium & plans](./premium-and-plans.md) |
| Work on SQLite, repositories, sync | [Data Layer](./data-layer.md) · [Sync Engine](./SYNC_ENGINE.md) · [Supabase alignment](./supabase-alignment.md) |
| Work on UI, fonts, theming | [UI & Theme](./ui-and-theme.md) |
| Work on mini-apps (Medication, Checkup, Immunization, Pregnancy, Period) | [Mini-Apps](./mini-apps.md) · [Contract](./mini-app-contract.md) |
| Work on Home, Emergency, Articles (Learn), Providers | [Core Features](./features.md) · [Provider model](./provider-model.md) · [Learn content model](./learn-content-model.md) · [Notifications](./notifications.md) · [Ads](./ads.md) |
| Configure env vars, app.json, constants | [Configuration](./configuration.md) |
| Follow dev conventions and scripts | [Development Guide](./development.md) |
| Run QA / manual regression | [QA Test Cases](./qa-test-cases.md) |
| See what's planned next | [Roadmap & Gaps](./roadmap.md) |

---

## Documentation map

```
docs/
├── README.md              ← You are here (index)
├── overview.md            Product vision, principles, tech stack
├── getting-started.md     Install, run, environment setup
├── architecture.md        Offline-first design, layers, bootstrap
├── adr/                   Architecture Decision Records
├── mini-app-contract.md   Checklist for new mini-apps
├── project-structure.md   Folder layout and conventions
├── navigation.md          Expo Router routes and tab structure
├── authentication.md      Auth, guest mode, sessions, biometrics
├── premium-and-plans.md   Free / Standard / Family Premium matrix (spec)
├── family-profiles.md     Household, kids, spouse connection
├── data-layer.md          SQLite, Drizzle, repositories
├── SYNC_ENGINE.md         Offline outbox, triggers, flow diagrams
├── ui-and-theme.md        Gluestack, Uniwind, typography, components
├── mini-apps.md           Medication, Checkup, Immunization, Pregnancy, Period
├── features.md            Home, Learn, Nearby, Emergency, Profile
├── notifications.md       In-app / push / email strategy
├── ads.md                 House / sponsored / AdMob (slots, sync, caps, troubleshooting)
├── configuration.md       app.json, env, storage keys, sync config
├── development.md         Scripts, TypeScript, linting, patterns
├── qa-test-cases.md       Manual QA suite for core + mini-apps + ads
└── roadmap.md             Phases, known gaps, future work
```

UI spacing rhythm for main tabs is documented in [UI & Theme](./ui-and-theme.md#tab-spacing-rhythm). Tab mount persistence is in [Navigation](./navigation.md#bottom-tabs).

---

## At a glance

| Area | Technology |
|------|------------|
| Framework | Expo SDK 57, React Native 0.86, React 19 |
| Routing | Expo Router (file-based, typed routes) |
| UI | Gluestack UI v5, Uniwind, Tailwind CSS v4 |
| Local DB | Expo SQLite + Drizzle ORM |
| Remote | Supabase (Auth, PostgreSQL) |
| Client state | Zustand |
| Server/cache state | TanStack Query |
| Forms | React Hook Form + Zod |
| Fonts | Inter (`@expo-google-fonts/inter`) |

---

## Core architectural rule

The UI **never talks directly to Supabase**. All persistent app data flows through repositories into SQLite first; sync happens in the background.

```
UI → Repository → SQLite → Sync Engine → Supabase
```

Rationale is recorded in [ADRs](./adr/README.md) (especially [ADR-002](./adr/002-why-sqlite.md), [ADR-003](./adr/003-why-supabase.md), [ADR-005](./adr/005-repository-pattern.md)). Signed-in mini-apps mirror into SQLite snapshots; guests stay device-local — see [Mini-Apps](./mini-apps.md) and [ADR-004](./adr/004-guest-first.md).

---

## Related files outside `docs/`

| File | Purpose |
|------|---------|
| [`CareMate.md`](../CareMate.md) | Original engineering implementation guide (source of architectural intent) |
| [`AGENTS.md`](../AGENTS.md) | Pointer to Expo SDK 57 docs for AI agents |
| [`.env.example`](../.env.example) | Environment variable template |

---

## Keeping docs up to date

When you add a feature, route, table, or mini-app, update the relevant doc page and add a link here if it is a new major area.
