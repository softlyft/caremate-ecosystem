# Family profiles

Family is a shared **household** for kids and spouse connections. Each parent keeps their own account data (profile, emergency card, settings, mini-apps).

## Flows

1. **Setup** (Me → Family or Settings → Family): “Are you a parent?” → kids count → DOB/gender per child → create household.
2. **Connect spouse**: email/phone lookup → show full matched profile → Connect (in-app pending request). If not found → copy/share a plain App Store / Play Store message (no invite tokens or deep links; connection happens in-app after they install).
3. **Accept/decline**: recipient sees Me → Family → requests; accept joins the requester’s household as `spouse`.

## Data

| Table | Purpose |
|-------|---------|
| `family_households` | Shared family unit |
| `family_members` | `self` / `spouse` / `child` |
| `family_connection_requests` | Pending spouse link |

Local: SQLite + sync queue. Remote: Supabase + RPCs `lookup_user_for_family_connect`, `create_family_connection_request`, `respond_family_connection_request`.

## Code

- Domain: `src/domains/family/`
- Immunization Tracker loads children from `family_members` (no add-child in the mini-app). Medication Tracker can assign meds to family kids.
- Screens: `src/app/(app)/family/*`
- QA: [QA Test Cases](./qa-test-cases.md) § Family / Immunization / Medication
