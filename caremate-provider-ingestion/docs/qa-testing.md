# QA Testing

Manual QA guide for the CareMate caremate-provider-ingestion service.

## Scope

This suite covers the implemented FastAPI ingestion flows:

- service startup and health
- authenticated ingest endpoints
- orchestrated chain ingest (`/v1/ingest/chain`) with UUID write-back
- single-resource organization/location/healthcareservice endpoints
- job polling
- projection rebuild expectations
- common failure scenarios

## Preconditions

Before testing:

1. `caremate-provider-ingestion/.env` is configured
2. Shared Supabase migrations are already applied
3. Sample workbooks are available from `caremate-provider-ingestion/samples/`
4. Service is running locally

Start locally with:

```bash
npm run ingest:dev
```

## Test Data

Use the sample files:

- `samples/ng_provider_organization.xlsx`
- `samples/ng_provider_location.xlsx`
- `samples/ng_provider_healthcareservice.xlsx`

## Smoke Tests

### Health

- `GET /health`

Expected:

- returns `status: ok`
- indicates whether Supabase is configured

### Auth

- Call an ingest endpoint without `Authorization`
- Call again with the wrong bearer token
- Call again with the configured `INGEST_API_KEY`

Expected:

- unauthorized requests fail with `401`
- authorized requests are accepted

## Ingest Flow Tests

### Chain ingest (recommended)

```bash
curl -X POST "http://127.0.0.1:8090/v1/ingest/chain?env=dev" \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -F "organization=@caremate-provider-ingestion/samples/ng_provider_organization.xlsx" \
  -F "location=@caremate-provider-ingestion/samples/ng_provider_location.xlsx" \
  -F "healthcareservice=@caremate-provider-ingestion/samples/ng_provider_healthcareservice.xlsx"
```

- Poll `GET /v1/jobs/{job_id}` until completion
- Inspect `runs/dev/{timestamp}/cleaned/` and `manifest.json`

Expected:

- job completes with org/location/HS counts
- cleaned workbooks contain generated UUIDs
- location `managingOrganization` / HS `location` resolved from codes or name slugs
- projection rebuild count is returned

### Single-resource organization ingest

- Upload to `POST /v1/ingest/organization`
- Poll until completion

Expected:

- inserted/updated counts and IDs in job details

### Single-resource location / healthcare service

- Prefer chain for first loads; single endpoints require parent UUIDs already present
- Orphan rows (non-UUID parents) are skipped with reasons

## Update Behavior Tests

- Re-upload a workbook with valid UUIDs already populated in rows

Expected:

- rows update instead of inserting duplicates

## Projection Validation

After successful location/service ingest:

- verify the shared `providers` projection contains nearby-pin rows keyed by location
- confirm one projection row exists per location as expected

## Failure Tests

### Wrong file type

- Upload a non-Excel file

Expected:

- request is rejected with a clear validation error

### Empty workbook/file

- Submit an empty upload

Expected:

- request fails clearly

### Wrong ingest order

- Upload location or healthcare service data before the required parent resources exist

Expected:

- orphan rows are skipped or the job fails with useful details

### Service role / Supabase misconfiguration

- Start the service with invalid Supabase credentials

Expected:

- health may still respond
- jobs fail with clear error details

## Suggested Verification Tools

You can test with curl, Postman, or the portal upload flow.

Example pattern (single resource):

```bash
curl -X POST http://127.0.0.1:8090/v1/ingest/organization \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -F "file=@caremate-provider-ingestion/samples/ng_provider_organization.xlsx" \
  -F "source=csv_ingest"
```

Prefer the chain curl above for end-to-end catalog loads.

## Known Constraints

- Jobs are stored in memory only
- Background execution is not durable across restarts
- Workbook processing is all-at-once, not streamed
- Delete reconciliation is limited; omission from a workbook does not behave like full delete sync
- Operators must manage UUID reuse/order carefully across resource stages
