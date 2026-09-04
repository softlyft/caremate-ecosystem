# Family profiles

Family is a shared **household** for kids and adult connections. Each adult keeps their own account data (profile, emergency card, settings, mini-apps).

**Plan limits** (children + invited adults): [Premium & plans](./premium-and-plans.md#family-profiles-by-plan). **Free:** 1 child. **Standard Premium:** up to 3 children. **Family Premium:** up to **6 children** total in the household (shared across adults, including kids an invited adult brings) and up to **3 invited adults** (owner not counted).

## Flows

1. **Setup** (Me → Family or Settings → Family): “Are you a parent?” → kids count → DOB/gender per child → create household.
2. **Invite family members** (Family Premium **owner only**): email/phone lookup → matched profile → Send invite. If not found → copy/share App Store / Play Store message. Up to **3** seats (accepted members + pending invites). Invited members cannot invite others.
3. **Accept/decline**: recipient opens Me → Family → requests; accept joins the owner’s household as `spouse` (DB kind for invited adults).
4. **Remove / cancel** (owner only): remove an invited adult or cancel a pending invite to free a seat.

## Data

| Table | Purpose |
|-------|---------|
| `family_households` | Shared family unit (`created_by_user_id` = owner) |
| `family_members` | `self` / `spouse` (invited adult) / `child` |
| `family_connection_requests` | Pending / accepted / declined / cancelled invites |

Local: SQLite + sync queue. Remote RPCs: `lookup_user_for_family_connect`, `create_family_connection_request`, `respond_family_connection_request`, `cancel_family_connection_request`, `remove_family_adult_member`, `family_adult_invite_seats_used`.

## Code

- Domain: `src/domains/family/`
- Immunization Tracker loads children from `family_members` (no add-child in the mini-app). Medication Assistant can assign meds to family kids.
- Screens: `src/app/(app)/family/*`
- QA: [QA Test Cases](./qa-test-cases.md) § Family / Immunization / Medication
