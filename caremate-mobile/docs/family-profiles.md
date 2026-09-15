# Family profiles

Family is a shared **household** for kids and adult connections. Each adult keeps their own account data (profile, emergency card, settings, mini-apps).

**Plan limits** (children + invited adults): [Premium & plans](./premium-and-plans.md#family-profiles-by-plan). **Free:** 1 child. **Standard Premium:** up to 3 children. **Family Premium:** up to **6 children** total across linked adults (federated view; no ownership transfer) and up to **3 invited adults** (owner not counted).

## Federated children (Family Premium)

Kids are **not moved** between households when someone accepts a Family invite. Access is a **union**:

- Each adult keeps children on their own household (owner HH or leftover HH after joining).
- While Family Premium is active on the shared household, every linked adult can **see** children from peer adults’ households (RLS + local sync pull + gateway PHI decrypt via accessible household ids).
- Cap is applied on the **federated visible list** (oldest first). Over-cap children are **hidden** until the plan covers them again (Free / Standard after downgrade too).
- **Only the Family plan owner** may add children (onto the owner household). Invitees can view and use shared kids in mini-apps but cannot add.

## Flows

1. **Setup** (Me → Family or Settings → Family): “Are you a parent?” → kids count → DOB/gender per child → create household.
2. **Invite family members** (Family Premium **owner only**): email/phone lookup → matched profile → Send invite. If not found → copy/share App Store / Play Store message. Up to **3** seats (accepted members + pending invites). Invited members cannot invite others.
3. **Accept/decline**: recipient opens Me → Family → requests (or taps the invite push/inbox card). Accept joins the owner’s household as `spouse` (DB kind for invited adults). The Family hub pulls remote invites so Accept/Decline is visible even before a background sync. The invitee’s active Family view and Family Premium entitlement resolve from that joined household (invites stay owner-only; invitees see the Family Premium badge, **federated** children, ad-free mini-apps).
4. **Remove / cancel** (owner only): remove an invited adult or cancel a pending invite to free a seat. Peer-child read access ends when Family Premium / membership no longer links the adults.

## Data

| Table | Purpose |
|-------|---------|
| `family_households` | Shared family unit (`created_by_user_id` = owner) |
| `family_members` | `self` / `spouse` (invited adult) / `child` |
| `family_connection_requests` | Pending / accepted / declined / cancelled invites |

Local: SQLite + sync queue. Remote RPCs: `lookup_user_for_family_connect`, `create_family_connection_request`, `respond_family_connection_request`, `cancel_family_connection_request`, `remove_family_adult_member`, `family_adult_invite_seats_used`.

RLS helper: `can_read_family_peer_household` (migration `20260915160000_family_federated_children_access.sql`) — SELECT on peer households/members while Family Premium is shared; writes stay membership-scoped; child INSERT on a Family Premium household is owner-only.

## Code

- Domain: `src/domains/family/` (`listAccessibleChildren`, `listVisibleAccessibleChildren`, `visible-children.ts`)
- Immunization Tracker / Medication Assistant load **visible federated** children (tier hide-extras).
- Screens: `src/app/(app)/family/*`
- Gateway: `listAccessibleHouseholdIds` expands peer leftover households for PHI decrypt.
- QA: [QA Test Cases](./qa-test-cases.md) § Family / Immunization / Medication
