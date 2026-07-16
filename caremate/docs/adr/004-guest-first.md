# ADR-004: Guest First

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-07-13 |

## Context

Healthcare literacy and emergency tooling are most valuable when friction is low. Forcing account creation before Browse articles, checking providers, or filling an emergency profile would exclude users on bad networks, shared devices, or first-time exploration. Softlyft’s product goals call out **guest-friendly** access explicitly.

## Decision

CareMate is **guest-first**:

- Default session is guest (`GUEST_USER_ID = 'guest'`) until the user signs in.
- Core features and mini-apps work offline as a guest with **device-local** persistence.
- Sign-in unlocks **cloud sync / backup** (and account-scoped rows), not the ability to use the app.
- Sign-out returns to guest; local guest-scoped data remains the guest path.

Auth uses Supabase when configured; demo sign-in covers offline development without a backend.

## Consequences

- Onboarding and navigation must not hard-gate the main tabs behind login.
- Repositories and mini-app sync must treat guest distinctly: **no push of guest data to Supabase** as an authenticated user row.
- Migrating guest → signed-in is required so users do not lose device-local work: `migrateGuestLocalData` copies/merges emergency, bookmarks, settings, profile fields, and family ownership; mini-apps still migrate AsyncStorage into snapshots on signed-in sync.
- Analytics, rate limits, and abuse controls cannot assume authenticated users.
- Privacy: device-local guest health data may remain after uninstall/reinstall differently than cloud accounts — communicate clearly in UX where needed.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Auth wall before home | Conflicts with health literacy and offline emergency goals |
| Anonymous Supabase auth for every install | Extra remote identity and RLS complexity for users who never convert |
| Guest read-only, write requires account | Breaks offline emergency profile and mini-app usefulness |
