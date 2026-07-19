# Data model

Shared Supabase project. Provider portal tables are cloud-authoritative; the mobile app does not mirror them into SQLite (connections are fetched live).

## Tables

| Table | Purpose |
|-------|---------|
| `provider_profiles` | Portal-facing org profile + `verification_status` (`pending` \| `verified` \| `suspended`) |
| `provider_org_members` | Staff membership + role (`owner` \| `administrator` \| `staff` \| `viewer`) |
| `provider_org_claims` | Claim verification challenges (email + code) |
| `patient_provider_connections` | Connection CRM row |
| `patient_provider_activities` | Timeline / audit-ish events |
| `provider_broadcasts` + `provider_broadcast_recipients` | Announcements |
| `provider_documents` | Document metadata; files in Storage bucket `provider-documents`. `organization_id` nullable for patient uploads; `source` is `provider` \| `patient`. |
| `appointment_requests` | Patient-initiated appointment requests |

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

Also depends on catalog / identity migrations: FHIR orgs (`provider_organizations`…), `profiles.patient_id`, Nearby RPC.

## RPCs & helpers

| Name | Role |
|------|------|
| `is_provider_org_member` / `provider_org_role` / `can_write_provider_org` / `can_manage_provider_org` | RLS + app auth |
| `is_provider_org_verified` | Patient Connect gate |
| `request_patient_provider_connection` | Patient → org |
| `request_provider_connection_by_caremate_id` | Org → patient by CareMate ID |

## Types

- Shared package: `@caremate/db-types` (`packages/db-types`)
- Portal overlay until regen: `caremate-provider-portal/src/types/database.ts`

After applying migrations:

```bash
npm run db:types
```

## Related

- [Connections](./connections.md)
- Shared index: [`../../supabase/docs/README.md`](../../supabase/docs/README.md)
