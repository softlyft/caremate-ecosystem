# Schema Overview

## Major Schema Groups

The shared schema currently covers these major product areas.

### Core sync tables

These support the mobile app’s local-first sync model:

- `profiles`
- `settings`
- `emergency_profiles`
- `bookmarks`
- `providers`
- `provider_favorites`
- `user_location_samples`
- `articles`
- `health_tips`
- `mini_app_snapshots`

### Family

- `family_households`
- `family_members`
- `family_connection_requests`

### Billing

- `subscription_prices` — catalog of Premium plans / amounts
- `payments` — Paystack/Stripe transaction ledger (money collected)
- `subscriptions` — entitlement after a successful payment **or** portal admin grant (`provider = admin`)

### Providers / FHIR ingest

- `provider_organizations`
- `provider_locations`
- `provider_healthcare_services`
- `providers` projection

### Provider engagement portal

Cloud-only (not mirrored to mobile SQLite). See [Provider Portal data model](../../caremate-provider-portal/docs/data-model.md).

- `provider_profiles`
- `provider_org_members`
- `provider_org_claims`
- `patient_provider_connections`
- `provider_payer_connections`
- `patient_payer_connections`
- `consent_definitions`
- `patient_provider_consents`
- `patient_provider_activities`
- `message_conversations` / `message_participants` / `message_messages` / `message_direct_pairs` (Realtime publication: `20260827140000_messaging_realtime.sql`)
- `provider_broadcasts` / `provider_broadcast_recipients` (legacy send audit)
- `provider_documents`
- `appointment_requests`
- `notification_devices`

### Portal/admin

- `admin_audit_events`

## Migration Groups

Current migrations cluster into these domains:

| Migration group | Files |
|-----------------|-------|
| Initial stubs / mini-app snapshots | `20260713195457_*`, `20260713195520_*`, `20260713195606_*` |
| Core sync schema | `20260713210000_core_sync_schema.sql` |
| Family | `20260713233000_family_profiles.sql`, `20260719210000_family_adult_invite_seats.sql` |
| Portal RBAC, tips, audit, storage | `20260714160000_admin_portal_rbac.sql` |
| Billing | `20260714180000_billing_subscriptions.sql`, `20260714210000_billing_interval_rename.sql`, `20260717190000_payments_ledger.sql`, `20260717193000_admin_activated_subscriptions.sql` |
| Article reads | `20260718010000_article_reads.sql` |
| Articles and tips read/soft-delete | `20260715100000_articles_public_read_soft_delete.sql`, `20260715110000_health_tips_public_read_soft_delete.sql` |
| Profiles patient ID | `20260715120000_profiles_patient_id.sql` |
| Providers ingest / FHIR / geo | `20260715130000_providers_ingest_fhir_ready.sql`, `20260715140000_provider_fhir_resources.sql`, `20260715180000_provider_resource_uuid_pks.sql`, `20260715190000_provider_organizations_unique_name.sql`, `20260715200000_nearby_providers_rpc.sql` |
| Provider engagement portal | `20260719140000_provider_portal.sql` … `20260719170000_connection_rejection_and_verified.sql`, `20260719200000_patient_document_uploads.sql`, `20260724100000_provider_read_connected_profiles.sql`, `20260724120000`–`20260724170000` (messaging, practitioner profile, mark-as-staff, DMs, RLS fix), `20260802120000_connection_consent_scopes.sql`, `20260802130000_patient_provider_consents.sql` |
| Community Network | `20260721100000_community_portal_phase1.sql`, `20260721113000_community_join_patient_verification.sql`, `20260721124500_community_chapter_administrative_hierarchy.sql`, `20260721130000_community_administrative_options.sql` |
| External news | `20260721180000_articles_external_news.sql` (`articles.first_seen_at`) |
| User location history + name search | `20260721190000_user_location_samples_and_search.sql` |

## Data Ownership Notes

- Mobile mirrors only selected synced data into SQLite
- Portal-only tables stay cloud-only
- Provider ingest resource tables are authoritative for provider source-of-truth writes
- The `providers` table is a read-optimized projection for nearby search

## Seed Behavior

`supabase/seed.sql` is intentionally a no-op placeholder. Catalog bootstrap is handled through the portal seed scripts rather than SQL seed files.
