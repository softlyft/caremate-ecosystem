# Catalogs and Admin Workflows

## Managed Catalog Areas

The portal currently manages five main catalog/admin surfaces:

- Articles (`articles`)
- Health tips (`health_tips`)
- Providers (`providers` plus ingest flow)
- Health insurance / payers (`payer_organizations`)
- Learn media uploads

## Articles

Routes:

- `/dashboard/learn`
- `/dashboard/learn/new`
- `/dashboard/learn/[id]`

Implemented behavior:

- List articles
- Create and edit article content
- Soft-delete articles
- Work with article metadata such as title, category, summary, content, publish state, and image/media references

The portal writes to shared cloud article rows that the mobile app later pulls into SQLite.

## Health Tips

Route:

- `/dashboard/tips`

Implemented behavior:

- List tips
- Create/edit tips
- Soft-delete tips

Tips are part of the mobile home experience and are synced into the mobile app’s local cache.

## Providers

Primary browse path is hierarchical catalog CRUD (organizations → locations → healthcare services). Flat list tabs remain secondary shortcuts. Workbook ingest and Nearby pin archive remain available.

Routes:

- `/dashboard/providers` — default Organizations tab; also Locations / Services / Nearby pins
- `/dashboard/providers/organizations/new` — create organization
- `/dashboard/providers/organizations/[id]` — edit organization + locations list
- `/dashboard/providers/organizations/[id]/locations/new`
- `/dashboard/providers/organizations/[id]/locations/[locationId]` — edit location + services list
- `/dashboard/providers/organizations/[id]/locations/[locationId]/services/new`
- `/dashboard/providers/organizations/[id]/locations/[locationId]/services/[serviceId]`
- `/dashboard/providers/upload` — workbook ingest
- `/dashboard/providers/[id]` — Nearby pin detail / pin archive
- `/dashboard/providers/services/[id]` — redirects into the nested service route when possible

Implemented behaviors:

- Create / update / soft-archive catalog orgs, locations, and healthcare services (`source: admin_portal`)
- Rebuild Nearby pins via `rebuild_provider_projection_for_location` after location/service writes (and after org updates for each active location)
- Paginated flat list shortcuts (`?page=`, 50 per page)
- Upload provider workbooks through the external ingest service
- Archive projected `providers` pin rows

### Catalog edit fields

- **Organization:** name, active
- **Location:** name, status, address, phone, email, latitude, longitude
- **Healthcare service:** name, active, service_type, location_id

Editors (`admin` / `editor`) mutate; other staff stay read-only.

## Health Insurance (payers)

Catalog for Care Portal payer claim (insurers / HMOs / payers). SoftLyft seeds rows; orgs claim via Care Portal with org type **Payer**.

Routes:

- `/dashboard/payers` — list + search (name / claim email)
- `/dashboard/payers/new` — create
- `/dashboard/payers/[id]` — edit / soft-archive

Fields: name, claim contact email, phone, website, address, active.

Editors (`admin` / `editor`) mutate via `can_edit_catalog()` RLS. Soft-archive sets `deleted_at` and `active: false`.

### Claim contact email

One org-wide email (same value on `provider_profiles.email` and every `provider_locations.email`). Used for provider claim. SoftLyft may change it on the organization page only while the profile is not `verified`; after verification it is locked. Providers cannot edit it.

### Upload flow

`src/domains/providers/actions.ts` sends `.xlsx` workbooks to the external provider ingestion API:

1. Validates the upload and selected resource type
2. Sends `POST /v1/ingest/{resource}` with the configured ingest API key
3. Writes an audit event
4. Polls `/v1/jobs/{job_id}` for job status

Supported resources:

- `organization`
- `location`
- `healthcareservice`

### Pin archive flow

Archiving a Nearby pin updates the `providers` projection row:

- `deleted_at`
- `active = false`
- `updated_at`

Catalog soft-archive of a location (or its org) also rebuilds/deactivates the matching pin.

## Learn Media Upload

Media upload is used by Learn/article workflows and targets a Supabase storage bucket created by the shared schema.

Current behavior:

- Uploads are initiated from portal flows
- The bucket and policies are defined in Supabase migrations
- The portal runtime does not host media itself

## Seed Scripts

Scripts live under `caremate-admin-portal/scripts/`:

| Script | Purpose |
|--------|---------|
| `bootstrap-admin.mjs` | Assign/create a staff user |
| `seed-articles.mjs` | Bootstrap article content |
| `seed-tips.mjs` | Bootstrap health tips |
| `seed-catalogs.mjs` | Bootstrap articles, providers, and tips |

These are intended for initial bootstrap and fixture loading, not as a primary content editing workflow.

## Current Constraints

- Provider upload depends on the external `caremate-provider-ingestion` service being configured and running
- The portal exposes an audit log browser at `/dashboard/audit`
- Some validation still lives mostly in forms/UI rather than in a shared server-side validation layer
