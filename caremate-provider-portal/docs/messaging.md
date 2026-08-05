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

- Org ↔ patient — allowed (org Messages)
- Patient ↔ practitioner (staff) — allowed (DM)
- Practitioner ↔ practitioner — allowed (DM)
- Patient ↔ patient (neither is staff) — **blocked**

“Practitioner” for DMs means an active `provider_org_members` row for that org (Phase B mark-as-staff), not only `profiles.is_health_practitioner`.

Both parties must be linked to the org (approved connection **or** active membership). Patient ↔ practitioner DMs also require the patient’s active **messaging** consent for that org.

## Phase A / B (profile & staff)

| Phase | What |
|-------|------|
| A | Patient edits profile (FHIR-oriented fields + NIN for NG) and may self-declare `is_health_practitioner`; then connects to an org |
| B | Owner/admin opens connected patient → **Mark as staff** → `mark_connected_patient_as_staff` (optional `company_email`, `company_phone`, `position`) |

## Device push registration (mobile)

`syncPushRegistration()` upserts `notification_devices` when the user is signed in (not guest), notifications are enabled, and OS permission + Expo token succeed. Runs after auth bootstrap and when the Me notifications toggle is turned on.

## Related

- [Data model](./data-model.md)
- [Connections](./connections.md)
- Edge Function: [`supabase/functions/notify-message`](../../supabase/functions/notify-message/)
- Mobile screens: `caremate-mobile/src/app/(app)/messages/`
