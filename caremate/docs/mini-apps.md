# Mini-Apps

[← Back to index](./README.md)

## Overview

Mini-apps are **standalone health tools** inside CareMate. They launch from the **Apps** tab (`/(app)/(tabs)/apps`) and open as stack screens with native headers.

Unlike core CareMate screens (TanStack Query + repositories), mini-apps use:

- **Zustand** for UI state
- **`persist` → AsyncStorage** for fast local cache
- **SQLite `mini_app_snapshots` + sync queue** when signed in (mirrors to Supabase)

They work fully offline. Guests stay device-local; signed-in users get cloud backup / restore.

Registry: `src/mini-apps/_kit/registry.ts` → `MINI_APPS`. Contract: [mini-app-contract.md](./mini-app-contract.md).

---

## Catalog (launcher order)

Order matches `MINI_APPS` in code:

| # | Id | Name | Theme | Focus |
|---|----|------|-------|-------|
| 1 | `medication-tracker` | Medication Tracker | Orange `#EA580C` / `#FFEDD5` | Daily dose adherence |
| 2 | `checkup-planner` | Checkup Planner | Teal `#0F766E` / `#CCFBF1` | Age/gender/region checkup schedule |
| 3 | `immunization-tracker` | Immunization Tracker | Green `#059669` / `#D1FAE5` | Childhood vaccine schedule |
| 4 | `pregnancy-tracker` | Pregnancy Tracker | Blue `#0284C7` / `#E0F2FE` | Pregnancy week + daily log |
| 5 | `period-tracker` | Period Tracker | Pink `#DB2777` / `#FCE7F3` | Cycle tracking + predictions |

Icons: `Pill`, `CalendarCheck`, `Syringe`, `Baby`, `CalendarHeart` (Lucide).

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
| Filtered selectors | Do **not** return a new array from a Zustand selector each call (React 19 `getSnapshot` loop). Select stable slices, derive with `useMemo`, use a module-level empty array constant |
| UI | `StyleSheet` + `AppText` + `Button`/`Input` + `palette` / `layoutSpacing` / `shadow.soft` |
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

## Medication Tracker

**Storage key:** `caremate-medication-tracker`

### Routes

| Route | Screen |
|-------|--------|
| `/(app)/apps/medication-tracker` | Today’s doses + medicine list |
| `/(app)/apps/medication-tracker/setup` | Add / edit medicine (modal) |
| `/(app)/apps/medication-tracker/log` | Log a dose (modal) |

### Store

| Field | Description |
|-------|-------------|
| `medications` | Medicines (`id`, `name`, `dosage`, `frequency`, `startDate`, `active`, `forKid`, `familyMemberId`, `patientName`, `notes?`) |
| `activeMedicationId` | Last selected medicine |
| `logs` | Dose logs (`id`, `medicationId`, `dateKey`, `slotIndex`, `notes?`) |

Hooks: `useMedicationTrackerStore`, `useMedicationTrackerHydrated`.

### Frequencies

| Id | Slots |
|----|-------|
| `once-daily` | Daily dose |
| `twice-daily` | Morning / Evening |
| `three-times-daily` | Morning / Afternoon / Evening |
| `as-needed` | Log when taken (multiple per day allowed) |

### Features

- Today adherence summary + progress
- Tap due / as-needed row to mark taken; tap again to undo
- Add, edit, pause, or remove medicines
- Calendar log for any date / slot

### Files

```
mini-apps/medication-tracker/
├── store.ts
├── utils.ts
└── constants.ts
app/(app)/apps/medication-tracker/
├── index.tsx
├── setup.tsx
└── log.tsx
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

### Store fields

| Field | Description |
|-------|-------------|
| `lastMenstrualPeriod` | ISO date key |
| `dueDate` | Calculated or entered |
| `babyNickname` | Display name (default “Baby”) |
| `dailyLogs` | `Record<dateKey, PregnancyDailyLog>` |

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
- Setup via LMP (due = LMP + 280 days) or due date
- Daily log: mood, symptoms, kicks, notes

### Files

```
mini-apps/pregnancy-tracker/
├── store.ts
├── utils.ts
└── constants.ts
app/(app)/apps/pregnancy-tracker/
├── index.tsx
├── setup.tsx
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
| `cycleLength` | 28 | Average cycle length (days) |
| `periodLength` | 5 | Bleeding length (days) |
| `loggedPeriodDays` | `[]` | `YYYY-MM-DD` keys |
| `lastPeriodStart` | derived | Earliest / latest period start used for predictions |

### Features

- Today hero — cycle day, days until next period
- 7-day strip and month calendar (`MonthCalendarGrid`)
- Cycle summary and simple predictions (`lastPeriodStart + cycleLength`)

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
| `caremate-medication-tracker` | Medication Tracker |
| `caremate-checkup-planner` | Checkup Planner |
| `caremate-immunization-tracker` | Immunization Tracker |
| `caremate-pregnancy-tracker` | Pregnancy Tracker |
| `caremate-period-tracker` | Period Tracker |

Also listed under [Data Layer → Mini-apps data](./data-layer.md#mini-apps-data).

---

## Cross-mini-app considerations

| Topic | Current state |
|-------|---------------|
| Data sync | Signed-in: JSON snapshots via sync engine → Supabase `mini_app_snapshots` |
| Multi-entity | Immunization: multiple children; Medication: multiple medicines |
| Region | Checkup Planner uses article country list; default INT |
| Linking | Period ↔ Pregnancy not connected |
| Offline | Fully offline; sync when online / reconnect / daily safety |
| Auth | Usable as guest; cloud backup requires sign-in |

---

## Cloud backup

1. Ensure Supabase CLI is linked (`npm run supabase:link`) and migrations are applied (`npm run supabase:db:push`).
2. Sign in on the device — existing AsyncStorage data migrates into snapshots on next sync.
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
