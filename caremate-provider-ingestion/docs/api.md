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
- whether Supabase credentials are configured

### `POST /v1/ingest/organization`

Accepts a workbook upload and starts an organization ingest job.

### `POST /v1/ingest/location`

Accepts a workbook upload and starts a location ingest job.

### `POST /v1/ingest/healthcareservice`

Accepts a workbook upload and starts a healthcare service ingest job.

### `GET /v1/jobs/{job_id}`

Returns the current state of a previously accepted ingest job.

## Request Expectations

For ingest routes:

- `multipart/form-data`
- `file` field containing `.xlsx` or `.xls`
- optional `source` field (defaults to `csv_ingest` in current flows)

## Accepted Response Shape

Successful ingest submission returns HTTP `202` and includes:

- `job_id`
- `status`
- `resource`

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

`details` can include:

- parsed row count
- skipped count
- inserted count
- updated count
- projection updates
- returned UUIDs
- skip reasons

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
