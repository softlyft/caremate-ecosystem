# API

## Auth

All ingest and job routes require:

```http
Authorization: Bearer <INGEST_API_KEY>
```

`/health` is public.

## Endpoints

### `GET /health`

Returns:

- service health status
- whether fallback / dev / prod Supabase credentials are configured
- `runs_dir`

### `POST /v1/ingest/chain-from-samples` (recommended)

Pulls canonical workbooks from shared Storage (`provider-ingest/samples/`) into local `samples/`, then runs the org → location → HS chain.

**Query**

| Input | Default | Notes |
|-------|---------|-------|
| `?env=` / `X-Ingest-Env` | `dev` | Target DB credentials |
| `force_download` | `true` | Re-fetch from Storage |
| `publish_samples` | `true` | Promote cleaned → local samples + Storage |

**Behaviour**

1. Ensure sample xlsx exist (download or clear 404 if Storage empty)
2. Detect `catalog_mode`: `bootstrap` (empty orgs) vs `update`
3. Chain ingest + write-back under `runs/{env}/{timestamp}/`
4. Optionally publish cleaned files as the new shared source of truth

### `POST /v1/ingest/chain`

Multipart upload variant (does **not** publish to Storage by default). Prefer `chain-from-samples` for the shared catalog.

**Query / header**

| Input | Values | Default |
|-------|--------|---------|
| `?env=` or `X-Ingest-Env` | `dev` \| `prod` | `dev` |

**Multipart fields**

| Field | Required | Notes |
|-------|----------|-------|
| `organization` | yes | `.xlsx` org workbook |
| `location` | no | location workbook |
| `healthcareservice` | no | healthcare service workbook |
| `source` | no | defaults to `csv_ingest` |

**Behaviour**

1. Creates `runs/{env}/{YYYYMMDD-HHMMSS}/` with `originals/`, `cleaned/`, `manifest.json`
2. Inserts/updates organizations; maps temp keys → UUID
3. Writes cleaned workbooks; resolves Location / HS refs
4. Rebuilds Nearby `providers` projection

Single-resource endpoints below remain for partial updates.

### `POST /v1/ingest/organization`

Accepts a workbook upload and starts an organization ingest job.

### `POST /v1/ingest/location`

Accepts a workbook upload and starts a location ingest job. Non-UUID `managingOrganization` rows are skipped (orphans). Prefer `/v1/ingest/chain` for first-time loads.

### `POST /v1/ingest/healthcareservice`

Accepts a workbook upload and starts a healthcare service ingest job.

### `GET /v1/jobs/{job_id}`

Returns the current state of a previously accepted ingest job.

## Request Expectations

For single-resource ingest routes:

- `multipart/form-data`
- `file` field containing `.xlsx` or `.xls`
- optional `source` field (defaults to `csv_ingest` in current flows)

## Accepted Response Shape

Successful ingest submission returns HTTP `202` and includes:

- `job_id`
- `status`
- `resource` (`organization` \| `location` \| `healthcareservice` \| `chain`)
- `env` (chain only)

## Job Status Shape

Job status includes:

- `job_id`
- `status`
- `filename`
- `source`
- timestamps
- `providers_upserted`
- `error`
- `details`

For chain jobs, `details` includes `run_dir`, `organization` / `location` / `healthcareservice` stats, cleaned file paths, and key maps.

## Job Lifecycle

Current statuses:


- `accepted`
- `running`
- `completed`
- `failed`

## Validation Behavior

Implemented validation includes:

- file must be present
- file must be Excel (`.xlsx` / `.xls`)
- workbook must contain data rows
- resource-specific parent references must resolve where required

Orphan behavior:

- locations without valid organizations are skipped
- services without valid locations are skipped

## Current Constraints

- No streaming upload path
- No chunked job processing
- No server-side rate limiting in this service
- No maximum file-size enforcement in the current code path
