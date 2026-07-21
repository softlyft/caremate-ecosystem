# Provider Ingestion Architecture

## Stack

- FastAPI
- Pydantic v2 / pydantic-settings
- pandas + openpyxl
- httpx
- Supabase PostgREST via service-role key

## High-Level Flow

```text
Upload workbook
  → FastAPI endpoint
  → BackgroundTasks job
  → Parse workbook rows
  → Map rows to resource payloads
  → Write resource tables
  → Rebuild providers projection
  → Poll job status
```

## Main Modules

| Module | Purpose |
|--------|---------|
| `app/main.py` | FastAPI routes, upload handling, job creation |
| `app/auth.py` | Bearer API key enforcement |
| `app/jobs.py` | In-memory job store and statuses |
| `app/pipeline.py` | Main ingest orchestration |
| `app/parsers/resource_xlsx.py` | Workbook row iteration |
| `app/mappers/resource_rows.py` | Organization/location/service mapping |
| `app/projection.py` | Rebuild `providers` projection |
| `app/writers/supabase.py` | Supabase writes and lookups |
| `app/settings.py` | Env configuration |

## Resource Flow

The implemented ingest order is:

1. Organization
2. Location
3. HealthcareService

Location rows depend on organization UUIDs. HealthcareService rows depend on location UUIDs.

## Write Model

The service writes resource-shaped rows into:

- `provider_organizations`
- `provider_locations`
- `provider_healthcare_services`

It then rebuilds the `providers` projection so the mobile app can query nearby locations efficiently.

## Projection Rules

- One nearby `providers` pin per location
- `providers.id` is the location UUID in the projection
- Services are aggregated into provider attributes
- Legacy/duplicate nearby rows can be soft-deactivated as part of projection rebuilds

## Legacy/Support Modules

Some Python modules still exist for earlier or alternate approaches, including flat canonical or FHIR publishing helpers. They are not the primary runtime flow for the current API endpoints.

## Current Architectural Constraints

- Jobs are stored in-process, not in Redis or the database
- `BackgroundTasks` runs in the same application process
- Writes are row-by-row, not bulk batched
- FHIR publish-out is stubbed rather than implemented as a live outbound integration
