# Development

## Prerequisites

- Python 3.11+
- Access to the shared Supabase project

## Environment

Copy:

```bash
cp caremate-provider-ingestion/.env.example caremate-provider-ingestion/.env
```

Variables:

| Variable | Purpose |
|----------|---------|
| `INGEST_API_KEY` | Bearer token for ingest endpoints |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Fallback when env-specific vars are empty |
| `SUPABASE_URL_DEV` / `SUPABASE_SERVICE_ROLE_KEY_DEV` | Dev target for `?env=dev` |
| `SUPABASE_URL_PROD` / `SUPABASE_SERVICE_ROLE_KEY_PROD` | Prod target for `?env=prod` |
| `RUNS_DIR` | Artifact root (`runs/{env}/{timestamp}/`) |
| `HOST` | Bind host |
| `PORT` | Uvicorn port |

## Local Start

From the service directory:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8090
```

From the monorepo root:

```bash
npm run ingest:dev
```

## Tests

```bash
cd caremate-provider-ingestion
source .venv/bin/activate   # or: python3.12 -m venv .venv && pip install -r requirements.txt
pytest --cov=app --cov-report=term-missing
```

From the monorepo root:

```bash
npm run ingest:test
```

Coverage target is 80%+ on app logic (Supabase writer + single-resource `pipeline.py` are excluded; they need live/integration fixtures). Chain orchestration is unit-tested with a fake writer.

Prefer `POST /v1/ingest/chain?env=dev` for first-time catalog loads.

## Operational Notes

- The portal expects this service at `PROVIDER_INGEST_URL`
- The portal authenticates with `PROVIDER_INGEST_API_KEY`
- This service writes using the Supabase service-role key

## Current Limitations

- In-memory job storage only
- Same-process background execution
- No durable queue
- No implemented outbound FHIR publishing
- Row-by-row write behavior
- No built-in file-size or rate-limit guardrails in the current code
