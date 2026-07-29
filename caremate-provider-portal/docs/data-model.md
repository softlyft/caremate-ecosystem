# Data model

Shared Supabase project. Provider portal tables are cloud-authoritative; the mobile app does not mirror them into SQLite (connections and messages are fetched live).

## Tables

| Table | Purpose |
|-------|---------|
| `provider_profiles` | Portal-facing org profile + `verification_status` (`pending` \| `verified` \| `suspended`). **Editable by providers:** website, description, logo, emergency contact, opening hours, organization type. **Claim contact `email`:** must match location emails; providers cannot edit; CareMate admin may edit only while unverified (syncs to all locations). Legacy columns `phone`, `address`, `services_offered` remain in the schema but are unused by portal UI writes. |
| `provider_org_members` | Staff membership + role (`owner` \| `administrator` \| `staff` \| `viewer`); optional `company_email`, `company_phone`, `position` |
| `provider_org_claims` | Claim verification challenges (email + code) |
| `patient_provider_connections` | Connection CRM row |
| `patient_provider_activities` | Timeline / audit-ish events |
| `message_conversations` | Chat threads (`org_patient` \| `direct`) |
| `message_participants` | User or organization party + read cursor |
| `message_messages` | Message bodies |
| `message_direct_pairs` | Unique DM pair per org (`user_low` / `user_high`) |
| `provider_broadcasts` + `provider_broadcast_recipients` | Legacy announcement audit (org send still may write a row) |
| `provider_documents` | Document metadata; files in Storage bucket `provider-documents`. `organization_id` nullable for patient uploads; `source` is `provider` \| `patient`. |
| `appointment_requests` | Patient-initiated appointment requests |

### Profiles (patient identity)

Relevant columns for engagement: `patient_id` (12-digit CareMate ID), FHIR-oriented fields (`gender`, address, `national_id`, `marital_status`), and `is_health_practitioner` (self-declare; staff elevation is via `provider_org_members`).

### `patient_provider_connections` (key columns)

| Column | Notes |
|--------|------|
| `patient_id` | Auth user UUID (`profiles.user_id`) — not the CareMate display ID |
| `organization_id` | → `provider_organizations` |
| `status` | `pending` \| `approved` \| `rejected` |
| `initiated_by` | `patient` \| `provider` |
| `rejection_reason` | Required when rejected |
| `patient_note` / `provider_note` | Optional request notes |
| `shared_scopes` | Default `basic`, `emergency` (data share later) |

Unique: `(patient_id, organization_id)`.

**Display CareMate ID:** `profiles.patient_id` (12-digit text). Lookup for provider-initiated requests uses that field.

## Migrations

| File | Purpose |
|------|---------|
| `20260719140000_provider_portal.sql` | Core portal tables, RLS, storage |
| `20260719150000_provider_org_claims.sql` | Claim tokens |
| `20260719160000_provider_connection_bidirectional.sql` | `initiated_by`, staff INSERT, request RPCs |
| `20260719170000_connection_rejection_and_verified.sql` | `rejection_reason`, one-lifetime request rules, `is_provider_org_verified`, claim verification backfill |
| `20260719200000_patient_document_uploads.sql` | Nullable `organization_id`, `source`, patient upload RLS + storage paths |
| `20260724100000_provider_read_connected_profiles.sql` | Org members may SELECT connected patients' `profiles` (+ shared `emergency_profiles`) |
| `20260724120000_messaging_inbox.sql` | `message_*` tables + `send_provider_org_message` / `post_patient_message` RPCs |
| `20260724130000_org_message_reply.sql` | `post_org_message` — staff reply in an existing thread |
| `20260724140000_profile_fhir_practitioner.sql` | Profile FHIR fields + `is_health_practitioner` |
| `20260724150000_mark_connected_patient_as_staff.sql` | Company fields on members + `mark_connected_patient_as_staff` |
| `20260724160000_direct_messaging.sql` | Org-scoped DMs, search/start RPCs, chat matrix helpers |
| `20260724170000_fix_message_rls_recursion.sql` | Security-definer participant helpers (fix inbox RLS recursion) |

Also depends on catalog / identity migrations: FHIR orgs (`provider_organizations`…), `profiles.patient_id`, Nearby RPC.

## RPCs & helpers

| Name | Role |
|------|------|
| `is_provider_org_member` / `provider_org_role` / `can_write_provider_org` / `can_manage_provider_org` | RLS + app auth |
| `is_provider_org_verified` | Patient Connect gate |
| `request_patient_provider_connection` | Patient → org |
| `request_provider_connection_by_caremate_id` | Org → patient by CareMate ID |
| `send_provider_org_message` | Org compose → patient threads |
| `post_patient_message` | Patient (or DM participant) reply |
| `post_org_message` | Org staff reply in `org_patient` thread |
| `mark_connected_patient_as_staff` | Owner/admin elevate connected patient |
| `search_messageable_users` / `start_direct_conversation` | Mobile DMs |
| `is_org_practitioner` / `is_linked_to_org` / `can_direct_message` | DM ACL |
| `is_message_conversation_participant` / `can_read_message_conversation` | Message RLS helpers |

## Types

- Shared package: `@caremate/db-types` (`packages/db-types`)
- Portal overlay: `caremate-provider-portal/src/types/database.ts`

After applying migrations:

```bash
npm run db:types
```

## Related

- [Messaging](./messaging.md)
- [Connections](./connections.md)
- Shared index: [`../../supabase/docs/README.md`](../../supabase/docs/README.md)
