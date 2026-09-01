# Mini-Apps

[← Back to index](./README.md)

## Overview

Mini-apps are **standalone health tools** inside CareMate. They launch from the **Apps** tab (`/(app)/(tabs)/apps`) and open as stack screens with native headers.

Unlike core CareMate screens (TanStack Query + repositories), mini-apps use:

- **Zustand** for UI state
- **`persist` → AsyncStorage** for fast local cache
- **SQLite `mini_app_snapshots` + sync queue** when signed in (mirrors to Supabase)

They work fully offline. Guests stay device-local; signed-in users get cloud backup / restore.

**Access:** Mini-apps require a signed-in patient account; Free vs Premium limits are enforced per [Premium & plans](./premium-and-plans.md).

Registry: `src/mini-apps/_kit/registry.ts` → `MINI_APPS`. Contract: [mini-app-contract.md](./mini-app-contract.md).

---

## Catalog (launcher order)

Order matches `MINI_APPS` in code:

| # | Id | Name | Theme | Focus |
|---|----|------|-------|-------|
| 1 | `vitals-tracker` | Vitals | Blue `#1D4ED8` / `#DBEAFE` | Manual vitals log (BP, sugar, HR, …) |
| 2 | `medication-tracker` | Medication Assistant | Orange `#EA580C` / `#FFEDD5` | Schedule, taken confirm, history, refill, in-app alerts |
| 3 | `checkup-planner` | Checkup Planner | Teal `#0F766E` / `#CCFBF1` | Age/gender/region checkup schedule |
| 4 | `immunization-tracker` | Immunization Tracker | Green `#059669` / `#D1FAE5` | Childhood vaccine schedule |
| 5 | `pregnancy-tracker` | Pregnancy Tracker | Blue `#0284C7` / `#E0F2FE` | Pregnancy week + daily log |
| 6 | `period-tracker` | Period Tracker | Pink `#DB2777` / `#FCE7F3` | Cycle tracking + predictions |

Icons: `Activity`, `Pill`, `CalendarCheck`, `Syringe`, `Baby`, `CalendarHeart` (Lucide).

Entitlement by plan (Free limits, Premium unlocks, guest blocked): [Premium & plans — Mini-apps matrix](./premium-and-plans.md#mini-apps-entitlement-matrix).

---

## Launcher (Apps tab)

File: `src/app/(app)/(tabs)/apps.tsx`

Renders cards from `MINI_APPS`:

- Icon, name, description
- Per-app `backgroundColor` / `color`
- `available: false` → disabled + “Coming soon”

Tap → `router.push(app.route)`.

### Adding a new mini-app

1. Extend `MiniAppId` and append (or insert) an entry in `MINI_APPS`
2. Create `src/mini-apps/<id>/{store,utils,constants}.ts`
3. Create `src/app/(app)/apps/<id>/{index,setup?,log?}.tsx`
4. Register `Stack.Screen`s in `src/app/(app)/_layout.tsx`
5. Update this doc + [Navigation](./navigation.md) + AsyncStorage keys in [Data Layer](./data-layer.md)

### Implementation conventions

| Topic | Pattern |
|-------|---------|
| Persistence | `createJSONStorage(() => createMiniAppSyncedStorage('<appKey>'))` — AsyncStorage + SQLite snapshot when signed in |
| Hydration | `use*Hydrated()` via `persist.hasHydrated` / `onFinishHydration`; disable writes until hydrated |
| Cloud empty-check | `isMiniAppPayloadEmpty` — non-empty strings (LMP/due), `hasCompletedSetup`, `paused`, nested logs count as content; default nickname `"Baby"` alone does not |
| Filtered selectors | Do **not** return a new array from a Zustand selector each call (React 19 `getSnapshot` loop). Select stable slices, derive with `useMemo`, use a module-level empty array constant |
| UI | `StyleSheet` + `AppText` + `Button`/`Input` + `palette` / `layoutSpacing` / `shadow.soft` |
| Validation dialogs | Branded `alert` / `confirm` from `components/ui/AppDialogHost` (not React Native `Alert`) for hard blocks, soft “save anyway”, and undo confirms |
| Dates | Prefer `shared/date-utils.ts`; reuse `MonthCalendarGrid` from period-tracker |
| Screens | Default exports only (Expo Router) |

---

## Shared utilities

`src/mini-apps/shared/date-utils.ts`

| Function | Purpose |
|----------|---------|
| `toDateKey(date)` | `YYYY-MM-DD` |
| `parseDateKey(key)` | Local `Date` |
| `addDays(date, n)` | Date arithmetic |
| `daysBetween(a, b)` | Day difference |
| `getMonthMatrix(ref)` | Calendar cells |
| `startOfDay(date)` | Strip time |

`MonthCalendarGrid` lives in `period-tracker/` and is reused by pregnancy, immunization, medication, and checkup planner setup/log screens.

Country list for Checkup Planner comes from `localizationService.listCountryOptions()` in `src/domains/localization/`.

---

## Medication Assistant

**Storage key:** `caremate-medication-tracker` · UI name **Medication Assistant** (route id stays `medication-tracker`)

### Routes

| Route | Screen |
|-------|--------|
| `/(app)/apps/medication-tracker` | Due now / upcoming / taken + medicine list |
| `/(app)/apps/medication-tracker/setup` | Add / edit medicine (modal) |
| `/(app)/apps/medication-tracker/log` | Log a dose (modal) |
| `/(app)/apps/medication-tracker/history` | Medication history |

### Store

| Field | Description |
|-------|-------------|
| `medications` | Medicines including `slotTimes`, `instructions`, refill fields, family assignment |
| `activeMedicationId` | Last selected medicine |
| `logs` | Dose logs (`id`, `medicationId`, `dateKey`, `slotIndex`, `notes?`, `takenAt?`) |

Hooks: `useMedicationTrackerStore`, `useMedicationTrackerHydrated`. Alerts: `evaluateMedicationAlerts` → in-app inbox + `notify-medication` Expo push; `syncMedicationScheduledNotifications` → local OS schedules at dose times.

### Frequencies

| Id | Slots |
|----|-------|
| `once-daily` | Daily dose (default 08:00) |
| `twice-daily` | Morning / Evening (08:00 / 20:00) |
| `three-times-daily` | Morning / Afternoon / Evening |
| `as-needed` | Log when taken (open row always available) |

### Features

- Clock-aware schedule (upcoming → due → missed with grace)
- Treatment period: optional **end date** (or 3/5/7/14/30-day presets); omit for ongoing
- Dosage instructions + taken confirmation on Today
- Refill quantity / due date + in-app refill reminder
- History by day / medicine
- Free tier: max 3 **active** medicines (create + reactivate gated)

### Files

```
mini-apps/medication-tracker/
├── alerts.ts
├── store.ts
├── utils.ts
├── constants.ts
├── localize.ts
└── …
app/(app)/apps/medication-tracker/
├── index.tsx
├── setup.tsx
├── log.tsx
└── history.tsx
```

---

## Checkup Planner

**Storage key:** `caremate-checkup-planner`

Educational guidance only — not a diagnosis or substitute for clinician advice.

### Routes

| Route | Screen |
|-------|--------|
| `/(app)/apps/checkup-planner` | Year checklist |
| `/(app)/apps/checkup-planner/setup` | DOB, gender, optional region (modal) |
| `/(app)/apps/checkup-planner/log` | Mark checkup done for a year (modal) |

### Profile

| Field | Description |
|-------|-------------|
| `dateOfBirth` | `YYYY-MM-DD` (required) |
| `gender` | `female` \| `male` \| `other` |
| `regionCode` | News country code, or `null` → **INT** |

### Completions

```typescript
{
  checkupId: string;
  year: number;           // calendar year the item was completed for
  completedDate: string;  // YYYY-MM-DD
  notes?: string;
}
```

### Year views

- Default: **this year**
- Toggle: **next year** (`currentYear + 1`)
- Age for eligibility = age on Dec 31 of the selected year

### Catalog (`CHECKUP_CATALOG`)

Cadences: `annual`, `once`, `every-2-years`, `every-3-years`, `every-5-years`.

Categories: `general`, `dental`, `vision`, `labs`, `screening`.

Examples:

| Checkup | Typical start | Notes |
|---------|---------------|-------|
| General medical checkup | 18+ | Annual |
| Dental checkup | 5+ | Annual |
| Eye / vision exam | 18+ | Every 2 years |
| Blood pressure | 18+ | Annual |
| Blood sugar screen | 35+ | Every 3 years |
| Cholesterol panel | 40+ | Every 5 years |
| Cervical screening | Female 25–65 | Every 3 years |
| Mammogram | Female 40–74 | Every 2 years |
| Prostate discussion | Male 50+ | Annual |
| Earlier prostate discussion | Male 45–49 | Region-emphasized (`NG`, `GH`, `KE`, …) |
| Colorectal screening | 45–75 | Every 5 years |

Filtering: `minAge` / `maxAge`, `gender`, optional `regions`. `other` gender shows shared + sex-specific items so nothing critical is hidden. Region-specific items are hidden when region is pure `INT`.

### Status

| Status | Meaning |
|--------|---------|
| `due` | Recommended for this year, not logged |
| `overdue` | Past year and still not logged |
| `upcoming` | Next year (or soon-to-be eligible) |
| `completed` | Logged for that calendar year |

### Files

```
mini-apps/checkup-planner/
├── store.ts
├── utils.ts
└── constants.ts
app/(app)/apps/checkup-planner/
├── index.tsx
├── setup.tsx
└── log.tsx
```

---

## Immunization Tracker

**Storage key:** `caremate-immunization-tracker`  
**Persist version:** `1` (migrates legacy single `profile` → `profiles[]`)

### Routes

| Route | Screen |
|-------|--------|
| `/(app)/apps/immunization-tracker` | Dashboard (per active child) |
| `/(app)/apps/immunization-tracker/setup` | Redirects to Family (children are not added here) |
| `/(app)/apps/immunization-tracker/log` | Log vaccine (modal) |

### Store

| Field | Description |
|-------|-------------|
| `profiles` | Children (`id`, `name`, `dateOfBirth`) |
| `activeProfileId` | Selected child |
| `records` | Vaccine logs scoped by `profileId` |

Hooks: `useImmunizationTrackerStore`, `useActiveImmunizationProfile`, `useActiveImmunizationRecords`, `useImmunizationTrackerHydrated`.

### Record shape

```typescript
{
  profileId: string;
  vaccineId: string;
  administeredDate: string;
  notes?: string;
  provider?: string;
}
```

### Vaccine schedule

19 vaccines in `immunization-tracker/constants.ts` (childhood timeline):

| Age | Vaccines |
|-----|----------|
| Birth | BCG, Hep B, OPV-0 |
| 6 weeks | Pentavalent-1, OPV-1, PCV-1, Rotavirus-1 |
| 10 weeks | Pentavalent-2, OPV-2, PCV-2, Rotavirus-2 |
| 14 weeks | Pentavalent-3, OPV-3, PCV-3 |
| 6 months | OPV booster |
| 9 months | Measles/MR, Yellow Fever |
| 15 months | Measles/MR-2, Vitamin A |

Each vaccine has `recommendedAgeWeeks` from date of birth.

### Status

| Status | Condition |
|--------|-----------|
| `completed` | Record exists for that child + vaccine |
| `overdue` | Past recommended date, no record |
| `due-soon` | Within 14 days |
| `upcoming` | More than 14 days away |

### Features

- Multi-child switcher chips (from Family household)
- Empty state → Family setup if no children
- Completion summary and progress for the active child
- Next due / overdue callout
- Full schedule list; tap row → log with vaccine pre-selected
- Edit / remove child (cascades records)

### Files

```
mini-apps/immunization-tracker/
├── store.ts
├── utils.ts
└── constants.ts
app/(app)/apps/immunization-tracker/
├── index.tsx
├── setup.tsx
└── log.tsx
```

---

## Pregnancy Tracker

**Storage key:** `caremate-pregnancy-tracker`

### Routes

| Route | Screen |
|-------|--------|
| `/(app)/apps/pregnancy-tracker` | Dashboard |
| `/(app)/apps/pregnancy-tracker/setup` | LMP or due date (modal) |
| `/(app)/apps/pregnancy-tracker/log` | Daily log (modal) |
| `/(app)/apps/pregnancy-tracker/tt` | Log next TT dose (modal) |
| `/(app)/apps/pregnancy-tracker/birth` | I've given birth → postpartum (modal) |

### Store fields

| Field | Description |
|-------|-------------|
| `pregnancyId` | Stable id for the active pregnancy |
| `status` | `active` \| `postpartum` \| `ended` \| `null` |
| `endedAt` | Date key when ended (cleared on new setup) |
| `birthDate` | Set by **I've given birth**; cleared when postpartum finishes |
| `lastMenstrualPeriod` | ISO date key |
| `dueDate` | Calculated or entered |
| `dueDateSource` | `lmp` or `due-date` (drives due-date copy) |
| `babyNickname` | Display name (default “Baby”) |
| `hasCompletedSetup` | True after LMP/due saved (hydrate empty-check) |
| `dailyLogs` | `Record<dateKey, PregnancyDailyLog>` |
| `pastPregnancies` | Archives (up to 20) with `outcome: 'birth' \| 'closed'` |
| `maternalTtDoses` | Mother-care TT1–TT5 (`{ id, dateKey }[]`) — **survives** End pregnancy / postpartum |

### Daily log shape

```typescript
{
  dateKey: string;
  mood?: string;
  symptoms: string[];
  kickCount: number;
  notes: string;
  weightKg?: number;
}
```

### Features

- Gestational age (week + day from LMP)
- Trimester + progress bar (0–40 weeks)
- Due date countdown and milestones (8, 12, 20, 28, 36, 40)
- Setup via LMP (due = LMP + 280 days) or due date; soft-confirm when updating or starting after ended
- Daily log: mood, symptoms, kicks, optional weight (kg), notes; recent history on dashboard
- **I've given birth** → mother **postpartum** mode (birth date, recovery card); gestational UI hidden; Period Tracker stays paused until finish
- **Close this pregnancy** — subtle quiet exit (no loss-specific wording); archives as `closed`, resumes Period Tracker
- **Finish postpartum care** — archives as `birth`, clears timeline, resumes Period Tracker
- **Mother care TT1–TT5** card at top of dashboard (independent of pregnancy timeline); modal `pregnancy-tracker/tt`
- In-app alerts (`evaluatePregnancyAlerts`): milestone soon, due soon/today/past-due, daily log nudge, TT2 due nudge — domain `pregnancy`, no OS push yet

### Files

```
mini-apps/pregnancy-tracker/
├── store.ts
├── utils.ts
├── constants.ts
├── maternal-tt.ts
├── validation.ts
├── alerts.ts
└── localize.ts
app/(app)/apps/pregnancy-tracker/
├── index.tsx
├── setup.tsx
├── log.tsx
├── tt.tsx
└── birth.tsx
```

---

## Vitals

**Storage key:** `caremate-vitals-tracker` · snapshot `app_key`: `vitals`

Quick manual log for common vitals — designed like a banking “balance” screen: open, see latest readings, log a new one in seconds.

### Routes

| Route | Screen |
|-------|--------|
| `/(app)/apps/vitals-tracker` | Latest snapshot + recent history |
| `/(app)/apps/vitals-tracker/log` | Log a reading (modal) |

### Supported vitals (MVP)

Blood pressure (mmHg), blood sugar (mmol/L or mg/dL), heart rate (bpm), body temperature (°C / °F), weight (kg / lbs), height (cm / ft+in), oxygen saturation (%), respiratory rate (breaths/min).

### Files

```
mini-apps/vitals-tracker/
├── constants.ts
├── localize.ts
├── store.ts
├── utils.ts
└── __tests__/
app/(app)/apps/vitals-tracker/
├── index.tsx
└── log.tsx
```

---

## Period Tracker

**Storage key:** `caremate-period-tracker`

### Routes

| Route | Screen |
|-------|--------|
| `/(app)/apps/period-tracker` | Dashboard |
| `/(app)/apps/period-tracker/log` | Log period days (modal) |

### Store fields

| Field | Default | Description |
|-------|---------|-------------|
| `cycleLength` | 28 | Average cycle length (days); user-adjustable via Cycle Summary steppers, clamped to 21–45 |
| `periodLength` | 5 | Bleeding length (days); updates from the most recent contiguous logged streak |
| `loggedPeriodDays` | `[]` | `YYYY-MM-DD` keys |
| `lastPeriodStart` | derived | Start of the most recent contiguous logged streak (prediction anchor) |
| `paused` | `false` | When true, predictions and logging are off |
| `pausedReason` | `null` | Currently `pregnancy` when auto-paused |

### Features

- Today hero — cycle day, days until next period
- 7-day strip and month calendar (`MonthCalendarGrid`)
- Cycle summary (adjustable average cycle length with +/- steppers) and simple predictions (`lastPeriodStart + cycleLength`)
- **Pregnancy pause** — setting up Pregnancy Tracker auto-pauses cycle predictions; resume anytime (re-pause while pregnant is available)

`usePeriodTrackerHydrated()` gates taps until rehydration finishes.

### Files

```
mini-apps/period-tracker/
├── store.ts
├── utils.ts
└── MonthCalendarGrid.tsx
app/(app)/apps/period-tracker/
├── index.tsx
└── log.tsx
```

---

## Storage keys

| Key | Mini-app |
|-----|----------|
| `caremate-vitals-tracker` | Vitals |
| `caremate-medication-tracker` | Medication Assistant |
| `caremate-checkup-planner` | Checkup Planner |
| `caremate-immunization-tracker` | Immunization Tracker |
| `caremate-pregnancy-tracker` | Pregnancy Tracker |
| `caremate-period-tracker` | Period Tracker |

Also listed under [Data Layer → Mini-apps data](./data-layer.md#mini-apps-data).

---

## Cross-mini-app considerations

| Topic | Current state |
|-------|---------------|
| Data sync | Signed-in: JSON snapshots via sync engine → gateway/Supabase `mini_app_snapshots` |
| Multi-entity | Immunization: multiple children; Medication: multiple medicines |
| Region | Checkup Planner uses article country list; default INT |
| Linking | Pregnancy setup auto-pauses Period Tracker; history kept; user can resume |
| Offline | Fully offline; sync when online / reconnect / daily safety |
| Auth | Guests are sent to login from Apps; cloud backup requires sign-in |

---

## Cloud backup

1. Ensure Supabase CLI is linked (`npm run supabase:link`) and migrations are applied (`npm run supabase:db:push`).
2. Sign in on the device — `prepareLocalAccount` runs `hydrateMiniAppsFromRemote` (pull snapshots into AsyncStorage **when local is empty**, then rehydrate stores) so a new device restores vitals and other trackers before the user opens an app. Ongoing edits still mirror via the sync engine.
3. Rebuild native apps after adding `expo-background-task` (`npx expo prebuild` / `expo run:*`) so daily background sync can register.

Optional later: normalize into per-entity SQLite tables for family sharing.

See [Data Layer](./data-layer.md) and [Configuration](./configuration.md#supabase-setup-production).

---

## Related docs

- [Navigation](./navigation.md) — full route table
- [UI & Theme](./ui-and-theme.md) — StyleSheet + `AppText` patterns
- [Data Layer](./data-layer.md) — sync policy + mini-app snapshot keys
- [Project Structure](./project-structure.md) — folder layout
- [Roadmap](./roadmap.md) — status and remaining polish
