# Catalogs and Admin Workflows

## Managed Catalog Areas

The portal currently manages four main catalog/admin surfaces:

- Articles (`articles`)
- Health tips (`health_tips`)
- Providers (`providers` plus ingest flow)
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

Routes:

- `/dashboard/providers`
- `/dashboard/providers/upload`
- `/dashboard/providers/[id]`

Implemented behaviors:

- List provider views across the projected provider catalog with **paginated** tables (`?page=`, 50 per page)
- Upload provider workbooks through the external ingest service
- Poll ingest job status
- Archive provider rows in the projected `providers` table

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

### Archive flow

Archiving updates the `providers` projection row:

- `deleted_at`
- `active = false`
- `updated_at`

This does not replace the underlying FHIR resource ingest model; it acts on the projected nearby directory row.

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
