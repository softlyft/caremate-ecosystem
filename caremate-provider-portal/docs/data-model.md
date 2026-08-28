# Data model

Shared Supabase project. Provider portal tables are cloud-authoritative; the mobile app does not mirror them into SQLite (connections and messages are fetched live).

## Tables

| Table | Purpose |
|-------|---------|
| `provider_profiles` | Portal-facing org profile + `verification_status` (`pending` \| `verified` \| `suspended`). **Editable by providers:** website, description, logo, emergency contact, opening hours, organization type. **Claim contact `email`:** must match location emails; providers cannot edit; CareMate admin may edit only while unverified (syncs to all locations). Legacy columns `phone`, `address`, `services_offered` remain in the schema but are unused by portal UI writes. |
| `provider_org_members` | Staff membership + role (`owner` \| `administrator` \| `staff` \| `viewer`); optional `company_email`, `company_phone`, `position` |
| `provider_org_claims` | Claim verification challenges (email + code) |
| `patient_provider_connections` | Connection CRM row |
| `consent_definitions` | CareMate / future org-custom consent catalog (FHIR-aligned) |
| `patient_provider_consents` | Per-connection FHIR Consent–shaped grants (source of truth) |
| `patient_provider_activities` | Timeline / audit-ish events |
| `message_conversations` | Chat threads (`org_patient` \| `direct`) |
| `message_participants` | User or organization party + read cursor |
| `message_messages` | Message bodies |
| `message_direct_pairs` | Unique DM pair per org (`user_low` / `user_high`) |
| `provider_broadcasts` + `provider_broadcast_recipients` | Legacy announcement audit (org send still may write a row) |
| `provider_documents` | Document metadata; files in Storage bucket `provider-documents`. `organization_id` nullable for patient uploads; `source` is `provider` \| `patient`. |
| `appointment_requests` | Appointment requests + portal-scheduled visits (`source`, `checked_in_at`) |
| `provider_appointment_availability` | Weekly availability windows for portal scheduling |
| `provider_org_modules` | Per-org module enable overrides (missing row = catalog default) |
| `lab_test_definitions` | Org lab test catalog |
| `lab_orders` / `lab_order_items` | Lab order workflow + results |
| `payer_organizations` | Care network payer catalog (SoftLyft-seeded); claim contact `email` |
| `payer_profiles` | Portal overlay for payers (`verification_status`, description, logo, …) |
| `payer_org_members` | Payer staff membership (same roles as providers) |
| `payer_org_claims` | Payer claim OTP challenges (service role only) |
| `provider_payer_connections` | Provider ↔ payer B2B CRM link (one row per pair) |
| `provider_org_plan_prices` / `provider_org_subscriptions` / `provider_org_payments` | Private Care Team org billing (Paystack; separate from patient Premium) |
| `patient_payer_connections` | Patient ↔ payer CRM link (one row per pair) |
| `patient_payer_activities` | Payer-side timeline / audit events for patient↔payer lifecycle |
| `payer_directory` | Public view of active payers **without** claim email (mobile Health Insurance Directory) |

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
| `shared_scopes` | Denormalized permit cache (`basic` + active consent codes). Source of truth: `patient_provider_consents`. |

Unique: `(patient_id, organization_id)`.

**Display CareMate ID:** `profiles.patient_id` (12-digit text). Lookup for provider-initiated requests uses that field.

### `provider_payer_connections` (key columns)

| Column | Notes |
|--------|------|
| `provider_organization_id` | → `provider_organizations` |
| `payer_organization_id` | → `payer_organizations` |
| `status` | `pending` \| `approved` \| `rejected` \| `cancelled` \| `disconnected` |
| `initiated_by` | `provider` \| `payer` |
| `provider_note` / `payer_note` | Optional request notes |
| `rejection_reason` | Required when rejected |

Unique: `(provider_organization_id, payer_organization_id)`.

### `patient_payer_connections` (key columns)

| Column | Notes |
|--------|------|
| `patient_id` | Auth user UUID (`profiles.user_id`) — not the CareMate display ID |
| `payer_organization_id` | → `payer_organizations` |
| `status` | `pending` \| `approved` \| `rejected` \| `cancelled` \| `disconnected` |
| `initiated_by` | `patient` \| `payer` |
| `patient_note` / `payer_note` | Optional request notes |
| `rejection_reason` | Required when rejected / cancelled |
| `disconnected_at` / `disconnected_by` | Set when an approved link ends (`patient` \| `payer`) |

Unique: `(patient_id, payer_organization_id)`.

Patient Connect gating uses `is_payer_org_verified` (`payer_profiles.verification_status = verified` after Care Portal claim). Details: [Connections](./connections.md#patient--payer-connections).

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
| `20260802120000_connection_consent_scopes.sql` | Opt-in emergency: default `basic` only; strip auto emergency |
| `20260802130000_patient_provider_consents.sql` | Consent registry + FHIR Consent rows; scopes cache sync |
| `20260803120000_provider_modules_appointments_lab.sql` | Module overrides, availability, appointment status/source, lab tables |
| `20260825120000_payer_organizations.sql` | Payer catalog, profiles, members, claims, RLS helpers, `payer_claim` OTP kind |
| `20260825160000_provider_payer_connections.sql` | Provider ↔ payer connections + claim-email RPCs |
| `20260825161000_payer_read_connected_provider_profiles.sql` | Payer members may SELECT connected provider profiles |
| `20260827190000_payer_read_connected_patient_profiles.sql` | Payer members may SELECT patient `profiles` for rows in `patient_payer_connections` (pending + approved; fixes portal “Unknown”) |
| `20260825162000_provider_payer_connections_public_approved_read.sql` | Public/anon read of approved connections (supported payers) |
| `20260825170000_protect_payer_manager_catalog_columns.sql` | Managers limited to phone/website/address on catalog |
| `20260825171000_enforce_provider_payer_connection_update.sql` | initiated_by approve rules + rejection_reason check |
| `20260825172000_narrow_provider_payer_public_surface.sql` | RPC for supported payers; approved-only profile peek |
| `20260825173000_payer_directory_hide_claim_email.sql` | Public `payer_directory` view without claim email |
| `20260825174000_payer_email_unique_and_updated_at.sql` | Unique claim email + updated_at triggers |
| `20260826180000_connection_graph_hardening.sql` | Patient ↔ payer connections + activities; disconnect/cancel RPCs; verified gates on request RPCs |

Also depends on catalog / identity migrations: FHIR orgs (`provider_organizations`…), `profiles.patient_id`, Nearby RPC.

## RPCs & helpers

| Name | Role |
|------|------|
| `is_provider_org_member` / `provider_org_role` / `can_write_provider_org` / `can_manage_provider_org` | RLS + app auth |
| `is_payer_org_member` / `payer_org_role` / `can_write_payer_org` / `can_manage_payer_org` / `is_payer_org_verified` | Payer RLS + app auth + patient Connect gate |
| `is_provider_org_verified` | Patient Connect gate (providers) |
| `request_patient_provider_connection` | Patient → org |
| `request_provider_connection_by_caremate_id` | Org → patient by CareMate ID |
| `find_verified_provider_org_id_by_claim_email` / `find_verified_payer_org_id_by_claim_email` | Claim-email org resolution |
| `request_provider_payer_connection_by_email` | Provider → payer by claim email |
| `request_payer_provider_connection_by_email` | Payer → provider by claim email |
| `request_patient_payer_connection` | Patient → payer (verified only) |
| `request_payer_patient_connection_by_caremate_id` | Payer → patient by CareMate ID |
| `respond_patient_payer_connection` | Approve / reject pending patient↔payer |
| `cancel_pending_patient_payer_connection` | Initiator withdraws pending patient↔payer |
| `disconnect_patient_payer_connection` | Either party ends approved patient↔payer |
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
