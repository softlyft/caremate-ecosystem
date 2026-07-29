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

**Recommended:** `POST /v1/ingest/chain-from-samples?env=dev|prod` pulls shared Storage workbooks into `samples/`, detects empty vs existing catalog (`bootstrap` / `update`), then runs Org → Location → HS with UUID write-back. Manual multipart `POST /v1/ingest/chain` remains for ad-hoc uploads.

## Quick start

```bash
cd caremate-provider-ingestion
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8090
```

Or from monorepo root: `npm run ingest:dev`

Auth: `Authorization: Bearer $INGEST_API_KEY`

## Tests

```bash
cd caremate-provider-ingestion
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest --cov=app --cov-report=term-missing
```

Or from the monorepo root: `npm run ingest:test`
