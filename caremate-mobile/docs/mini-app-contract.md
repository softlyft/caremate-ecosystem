# Mini-app contract

[← Back to index](../README.md) · [ADR-006](./adr/006-core-vs-mini-apps.md)

Use this checklist for every new mini-app (e.g. appointments).

## Must have

1. **Ids (one row in the kit registry)**
   - Route / launcher id: `kebab-tracker` (Expo path `/(app)/apps/<id>`)
   - Snapshot key (`MiniAppKey`): short token used in SQLite/Supabase (`medication`, not `medication-tracker`)
   - AsyncStorage persist name: `caremate-<id>`

2. **Module folder** `src/mini-apps/<id>/`
   - `store.ts` — Zustand + `persist` + `createMiniAppSyncedStorage('<MiniAppKey>')`
   - `utils.ts` / `constants.ts` as needed
   - Optional components (shared calendar lives in `_kit`)

3. **Routes** under `src/app/(app)/apps/<id>/`
   - Typical: `index`, `setup`, `log` (period-style apps may omit setup)

4. **Launcher** — entry in `MINI_APPS` (`src/mini-apps/_kit/registry.ts`)

5. **Hydration** — register `persist.rehydrate` via `registerMiniAppRehydrate` in the app’s store module (side-effect import from kit bootstrap)

6. **Guest vs signed-in**
   - Guest: AsyncStorage only (synced storage no-ops cloud)
   - Signed-in: SQLite `mini_app_snapshots` + sync queue → Supabase

7. **Core dependencies** — import only public APIs (`@/domains/providers`, `@/domains/profile`, …), never another mini-app’s internals (except `_kit`)

## Must not

- Call Supabase from screens or the Zustand store
- Add a one-off branch in `sync/engine.ts` (use registries)
- Store secrets in AsyncStorage snapshots

## Sync / Supabase

If the snapshot shape is already covered by `mini_app_snapshots.app_key` check constraint, add the new key in:

- SQLite/app constants (`MINI_APP_KEYS`)
- Supabase migration (widen `app_key` check) via `npm run supabase:db:push`
