# CareMate Provider Ingestion

Python FastAPI service: FHIR-shaped Excel → resource tables → Nearby `providers` projection.

## Docs

For service-specific documentation, start here:

- [Provider-ingestion docs index](./docs/README.md)
- [Architecture](./docs/architecture.md)
- [API](./docs/api.md)
- [Data model](./docs/data-model.md)
- [Development](./docs/development.md)

## Model

```text
Organization 1 ── N Location 1 ── N HealthcareService
                      ↓
              providers (1 pin per Location)
```

Run ingest **separately**, in order:

1. `POST /v1/ingest/organization`
2. `POST /v1/ingest/location` (refs must be Organization UUIDs from step 1)
3. `POST /v1/ingest/healthcareservice` (refs must be Org/Location UUIDs)

**IDs:** omit UUID or use a non-UUID label → **insert** (Postgres `gen_random_uuid`). Paste the portal UUID back into the sheet → **update**.

## Quick start

```bash
cd provider-ingestion
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8090
```

Or from monorepo root: `npm run ingest:dev`

Auth: `Authorization: Bearer $INGEST_API_KEY`

## Samples

See [`samples/README.md`](samples/README.md). Manual Org→Location→HS reference prep in Excel for now.
