# Provider Ingestion Docs

This docs set covers the implemented CareMate provider-ingestion service.

## Quick Links

| Topic | Read |
|------|------|
| Service structure and pipeline flow | [Architecture](./architecture.md) |
| HTTP endpoints, auth, jobs | [API](./api.md) |
| Provider resource model and projection rules | [Data Model](./data-model.md) |
| Local setup, env vars, samples, limitations | [Development](./development.md) |
| Manual verification and endpoint smoke tests | [QA Testing](./qa-testing.md) |

## What the Service Does

The ingestion service accepts provider workbooks and writes FHIR-shaped provider resources into Supabase:

- `provider_organizations`
- `provider_locations`
- `provider_healthcare_services`

It then rebuilds the nearby `providers` projection used by the mobile app.

## Source Areas

| Area | Path |
|------|------|
| API server | `app/main.py` |
| Job pipeline | `app/pipeline.py` |
| Workbook parsing | `app/parsers/` |
| Row mapping | `app/mappers/` |
| Projection rebuilds | `app/projection.py` |
| Supabase writes | `app/writers/supabase.py` |
| Samples | `samples/` |
