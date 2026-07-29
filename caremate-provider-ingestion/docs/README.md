# Provider Ingestion Docs

This docs set covers the implemented CareMate caremate-provider-ingestion service.

## Quick Links

| Topic | Read |
|------|------|
| Service structure and pipeline flow | [Architecture](./architecture.md) |
| HTTP endpoints, auth, jobs | [API](./api.md) |
| Provider resource model and projection rules | [Data Model](./data-model.md) |
| Local setup, env vars, samples, limitations | [Development](./development.md) |
| Manual verification and endpoint smoke tests | [QA Testing](./qa-testing.md) |

## What the Service Does

The ingestion service accepts provider workbooks and writes FHIR-shaped provider resources into Supabase. Prefer `POST /v1/ingest/chain?env=dev|prod` so Organization → Location → HealthcareService runs in one job with UUID write-back into `runs/{env}/.../cleaned/`.

- `provider_organizations`
- `provider_locations`
- `provider_healthcare_services`

It then rebuilds the nearby `providers` projection used by the mobile app.

## Source Areas

| Area | Path |
|------|------|
| API server | `app/main.py` |
| Chain orchestration | `app/orchestrate.py` |
| Single-resource pipeline | `app/pipeline.py` |
| Key / slug resolution | `app/keys.py` |
| Run artifacts | `app/run_storage.py` |
| Workbook write-back | `app/workbook_writeback.py` |
| Workbook parsing | `app/parsers/` |
| Row mapping | `app/mappers/` |
| Projection rebuilds | `app/projection.py` |
| Supabase writes | `app/writers/supabase.py` |
| Samples | `samples/` |
