# QA Testing

Manual QA guide for the CareMate provider-ingestion service.

## Scope

This suite covers the implemented FastAPI ingestion flows:

- service startup and health
- authenticated ingest endpoints
- organization/location/healthcareservice sequencing
- job polling
- projection rebuild expectations
- common failure scenarios

## Preconditions

Before testing:

1. `provider-ingestion/.env` is configured
2. Shared Supabase migrations are already applied
3. Sample workbooks are available from `provider-ingestion/samples/`
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

### Organization ingest

- Upload the organization workbook to `POST /v1/ingest/organization`
- Capture the returned `job_id`
- Poll `GET /v1/jobs/{job_id}` until completion

Expected:

- job transitions through accepted/running/completed
- completed job returns inserted/updated counts and IDs

### Location ingest

- Upload the location workbook after organization ingest
- Poll the job to completion

Expected:

- valid organization-linked rows are written
- orphan rows are skipped with reasons when parent UUIDs are missing or invalid

### HealthcareService ingest

- Upload the healthcare service workbook after location ingest
- Poll the job to completion

Expected:

- valid location-linked rows are written
- projection rebuild count is returned
- orphan rows are skipped with reasons when parent location UUIDs are missing or invalid

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

Example pattern:

```bash
curl -X POST http://127.0.0.1:8090/v1/ingest/organization \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -F "file=@provider-ingestion/samples/ng_provider_organization.xlsx" \
  -F "source=csv_ingest"
```

## Known Constraints

- Jobs are stored in memory only
- Background execution is not durable across restarts
- Workbook processing is all-at-once, not streamed
- Delete reconciliation is limited; omission from a workbook does not behave like full delete sync
- Operators must manage UUID reuse/order carefully across resource stages
