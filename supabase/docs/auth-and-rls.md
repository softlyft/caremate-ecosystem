# Auth and RLS

## Auth Model

The shared backend uses Supabase Auth for application users and staff users.

Key role behavior:

- End users authenticate through normal Supabase auth
- Staff access is based on Supabase user metadata role claims
- The portal reads staff role from `app_metadata.role`

## Role Helpers

Shared SQL helpers introduced by migrations include:

- `jwt_role()`
- `is_staff()`
- `is_admin()`
- `can_edit_catalog()`

These functions back portal authorization and catalog write policies.

## RLS Pattern by Area

### User-scoped synced data

Tables such as profiles, settings, emergency profiles, bookmarks, mini-app snapshots, and favorites use user-based RLS rules.

### Staff-edited catalog data

Tables such as articles and health tips allow public or authenticated reads as configured, but writes are restricted to staff/editor roles through shared helpers.

### Billing

- Price management is admin-only
- Subscription writes are not intended for normal clients
- Webhooks and Edge Functions use privileged paths

### Providers and provider resources

Providers-related access is split between:

- nearby projection reads
- staff/provider-ingestion writes
- helper RPCs for provider lookup or projection support

## Storage

Portal media upload depends on shared storage bucket and policy setup defined in the migrations.

## Important Boundary

RLS and auth logic are shared infrastructure. App-level authorization must still be enforced in the mobile app, portal server actions, and ingest service where applicable.
