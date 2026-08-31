# Messaging

CareMate messaging covers two products that share `message_*` tables:

1. **Org ↔ patient Messages** — clinic-initiated threads (compose to all or selected connected patients; two-way replies).
2. **Direct messages (DMs)** — person-to-person chat scoped to a shared organization, with practitioner rules.

Portal UI for org Messages still lives under `/app/broadcasts` (nav label: **Messages**). Mobile: Home → Messages (`/(app)/messages`).

## Org ↔ patient

| Piece | Detail |
|-------|--------|
| Start thread | Portal staff with write access → `send_provider_org_message` (audience `all` or `selected`) |
| Patient reply | Mobile → `post_patient_message` |
| Org reply | Portal thread → `post_org_message` |
| Prerequisite | Approved connection **and** active `messaging` consent (`'messaging' ∈ shared_scopes`) |
| Push | Edge Function `notify-message` (org mode) — “New message from {Provider Name}” |

Legacy `provider_broadcasts` rows may still be written as send audit; the live inbox is `message_conversations` (`kind = 'org_patient'`).

## Direct messages (Phase C)

| Piece | Detail |
|-------|--------|
| Search | Mobile → `search_messageable_users` (name or CareMate Patient ID) |
| Start / open | `start_direct_conversation` |
| Reply | `post_patient_message` (also works for `kind = 'direct'`) |
| Pair key | `message_direct_pairs` (`organization_id`, ordered user pair) |
| Push | `notify-message` with `{ mode: 'direct', messageIds }` |

**Chat matrix (same org):**

- Org ↔ patient — allowed (org Messages) — **always free** (no Private Care Team plan required)
- Patient ↔ Private Care Team member — allowed (DM)
- Practitioner ↔ practitioner — allowed (DM) when both are org members
- Patient ↔ staff who is **not** on Private Care Team — **blocked**
- Patient ↔ patient (neither is staff) — **blocked**

“Private Care Team member” means `provider_org_members.private_care_team = true` (and not a viewer). Mark-as-staff alone does **not** enable patient DMs. Plans / seats: [Provider plans](./provider-plans.md).

`can_direct_message` enforces PCT for any DM involving a patient; staff↔staff keeps the membership-based check.

Both parties must be linked to the org (approved connection **or** active membership). Patient ↔ practitioner DMs also require the patient’s active **messaging** consent for that org.

## Phase A / B (profile & staff)

| Phase | What |
|-------|------|
| A | Patient edits profile (FHIR-oriented fields + NIN for NG) and may self-declare `is_health_practitioner`; then connects to an org |
| B | Owner/admin opens connected patient → **Mark as staff** → `mark_connected_patient_as_staff` (optional `company_email`, `company_phone`, `position`) |

## Device push registration (mobile)

`syncPushRegistration()` upserts `notification_devices` when the user is signed in (not guest), notifications are enabled, and OS permission + Expo token succeed. Runs after auth bootstrap and when the Me notifications toggle is turned on.

## Realtime

Mobile inbox + thread subscribe to Supabase Realtime `postgres_changes` on:

- `message_messages`
- `message_conversations`
- `message_participants`

Publication + `REPLICA IDENTITY FULL`: migration `20260827140000_messaging_realtime.sql`.

Delivery is RLS-scoped (same SELECT policies as REST). React Query caches invalidate on events; a slow poll (~60s) remains as a reconnect safety net. Push via `notify-message` still notifies when the app is backgrounded.

## Related

- [Data model](./data-model.md)
- [Connections](./connections.md)
- Edge Function: [`supabase/functions/notify-message`](../../supabase/functions/notify-message/)
- Mobile screens: `caremate-mobile/src/app/(app)/messages/`
