# ADR-006: Core shell vs mini-app packaging

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-07-13 |

## Context

CareMate will keep a **thin core** (auth, emergency, learn/articles, providers, profile/settings, home shell) while most new product surface ships as **mini-apps** (medication, checkup, immunization, pregnancy, period, future appointments, etc.). We need packaging that matches that growth model without a bloated `domains/` rewrite of every layer.

## Decision

1. **Platform** (cross-cutting): `database/`, `sync/` (engine + registry + queue), auth, UI kit, AppProviders. Domains and mini-apps **register** with sync; they do not own the DB client or sync orchestrator.
2. **Core domains** under `src/domains/`: vertical slices for emergency, articles, providers, profile (UI helpers + repository + public `index.ts`).
3. **Mini-apps** under `src/mini-apps/`: each app is a module; shared contract lives in `src/mini-apps/_kit/`.
4. **Home** stays a composition shell (`features/home` or later `domains/home`) that only imports public APIs.
5. Future product (e.g. appointments) defaults to a **mini-app**, not a new core domain, unless it must be navigational chrome.

## Consequences

- New tools: follow the mini-app kit checklist; register snapshot key + launcher entry.
- Core changes: prefer one PR per domain folder.
- Sync engine grows via `registerSyncHandler`, not hard-coded maps.
- Screens still never import `@supabase/supabase-js` for CRUD ([ADR-005](./005-repository-pattern.md)).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Full `domains/` for every mini-app under core | Fights the product model; duplicates the mini-app kit |
| Keep layer folders forever (`repositories/` only) | Works short-term; hurts cohesion as slices grow |
| Auth wall / appointments-as-core-only | Conflicts with guest-first and mini-app growth |
