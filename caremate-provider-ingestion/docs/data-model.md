# Data Model

## Resource Hierarchy

The ingest model is:

```text
Organization 1 → N Location 1 → N HealthcareService
                     ↓
             providers projection
```

## Primary Tables

The service writes to the shared Supabase tables:

- `provider_organizations`
- `provider_locations`
- `provider_healthcare_services`
- `providers` (projection rebuild)

## ID Rules

The current ingest contract treats IDs this way:

| Input ID | Result |
|----------|--------|
| Missing or non-UUID | Insert new row |
| Valid UUID | Update existing row if present |

This applies to the resource row’s own `id` and to parent references where relevant.

## Organization Rules

- Name is required
- Resource JSON is stored with scalar convenience columns
- Existing orgs can also be matched through the current unique-name handling path
- On chain ingest, temporary keys come from `identifier.code` (preferred) or a slugified name

## Location Rules

- Name is required
- On **chain** ingest: `managingOrganization` may be an org code, slugified org name, or UUID — resolved after orgs are written
- On **single-resource** location ingest: non-UUID managing org → skipped (orphan)
- Parent organization must exist before the location row is saved

## HealthcareService Rules

- Name is required
- On **chain** ingest: `location` may be a location code/name slug or UUID — resolved after locations are written
- On **single-resource** HS ingest: non-UUID location → skipped (orphan)
- `organization_id` is taken from the resolved location

## Run artifacts (chain)

```text
runs/{dev|prod}/{YYYYMMDD-HHMMSS}/
  originals/     # uploaded workbooks
  cleaned/       # workbooks with UUIDs filled in
  manifest.json  # counts, key maps, paths
```

## Projection Behavior

The nearby directory uses a denormalized `providers` projection:

- one row per location
- includes organization and location display fields
- includes aggregated service metadata
- supports geospatial nearby lookup through the shared Supabase RPC

## Mobile Relationship

The mobile app does not sync the full national provider catalog to SQLite. It queries nearby provider pages remotely and caches the results locally.

## Samples

See `caremate-provider-ingestion/samples/README.md` and the sample workbooks. Prefer `/v1/ingest/chain` so cleaned copies under `runs/` carry UUIDs for later updates.
