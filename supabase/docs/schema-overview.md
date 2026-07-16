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
- `articles`
- `health_tips`
- `mini_app_snapshots`

### Family

- `family_households`
- `family_members`
- `family_connection_requests`

### Billing

- `subscription_prices`
- `subscriptions`

### Providers / FHIR ingest

- `provider_organizations`
- `provider_locations`
- `provider_healthcare_services`
- `providers` projection

### Portal/admin

- `admin_audit_events`

## Migration Groups

Current migrations cluster into these domains:

| Migration group | Files |
|-----------------|-------|
| Initial stubs / mini-app snapshots | `20260713195457_*`, `20260713195520_*`, `20260713195606_*` |
| Core sync schema | `20260713210000_core_sync_schema.sql` |
| Family | `20260713233000_family_profiles.sql` |
| Portal RBAC, tips, audit, storage | `20260714160000_admin_portal_rbac.sql` |
| Billing | `20260714180000_billing_subscriptions.sql`, `20260714210000_billing_interval_rename.sql` |
| Articles and tips read/soft-delete | `20260715100000_articles_public_read_soft_delete.sql`, `20260715110000_health_tips_public_read_soft_delete.sql` |
| Profiles patient ID | `20260715120000_profiles_patient_id.sql` |
| Providers ingest / FHIR / geo | `20260715130000_providers_ingest_fhir_ready.sql`, `20260715140000_provider_fhir_resources.sql`, `20260715180000_provider_resource_uuid_pks.sql`, `20260715190000_provider_organizations_unique_name.sql`, `20260715200000_nearby_providers_rpc.sql` |

## Data Ownership Notes

- Mobile mirrors only selected synced data into SQLite
- Portal-only tables stay cloud-only
- Provider ingest resource tables are authoritative for provider source-of-truth writes
- The `providers` table is a read-optimized projection for nearby search

## Seed Behavior

`supabase/seed.sql` is intentionally a no-op placeholder. Catalog bootstrap is handled through the portal seed scripts rather than SQL seed files.
