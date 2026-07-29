# Provider ingest samples

## Source of truth

Canonical catalog workbooks live in **Supabase Storage** (shared across envs):

```text
bucket: provider-ingest
path:   samples/ng_provider_organization.xlsx
        samples/ng_provider_location.xlsx
        samples/ng_provider_healthcareservice.xlsx
```

This git folder keeps **`README.md` only**. The `.xlsx` files are downloaded locally when needed (they are gitignored).

### Pull samples

```bash
cd caremate-provider-ingestion
source .venv/bin/activate
python scripts/download_samples_from_storage.py --force
```

If files are missing locally **and** not in Storage, ingest fails with a clear error.

### Publish samples (after a cleaned rebuild)

```bash
python scripts/upload_samples_to_storage.py
```

## Recommended ingest

Same Storage seed → different DBs via `?env=dev|prod`.

```bash
# Pull from Storage → samples/, then chain ingest
curl -X POST "http://127.0.0.1:8090/v1/ingest/chain-from-samples?env=dev" \
  -H "Authorization: Bearer $INGEST_API_KEY"
```

Job `details.catalog_mode`:

| Mode | When | Behaviour |
|------|------|-----------|
| `bootstrap` | Target env has **no** active organizations | Seed (upsert cleaned UUIDs into empty DB) |
| `update` | Catalog already has rows | Upsert/update from the same workbooks |

Environments diverge after seed (new rows in one env are not auto-mirrored). The Storage catalog is the shared **starter / SoT for seed + intentional updates**, not a live bidirectional sync.

On success with `publish_samples=true` (default for chain-from-samples), cleaned workbooks are copied back to local `samples/` and uploaded to Storage.

## Files (once downloaded)

| File | Role |
|------|------|
| `ng_provider_organization.xlsx` | Organizations |
| `ng_provider_location.xlsx` | Locations |
| `ng_provider_healthcareservice.xlsx` | Healthcare services |

After cleaning, an **`id`** column holds the Postgres UUID. Re-ingest without edits should update the same UUIDs.

## Manual upload (ad-hoc)

`POST /v1/ingest/chain` still accepts multipart files; it does **not** publish to Storage by default.

## Rebuild local cleaned from a prior run

```bash
python scripts/rebuild_cleaned_from_run.py \
  --run-dir runs/dev/YYYYMMDD-HHMMSS \
  --update-samples
python scripts/upload_samples_to_storage.py
```
