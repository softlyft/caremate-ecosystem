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

## Location Rules

- Must reference an organization UUID in `managingOrganization`
- Missing/non-UUID parent references are treated as orphan rows and skipped
- Projection rebuild happens after save

## HealthcareService Rules

- Must reference a location UUID
- Organization is derived from the location when needed
- Projection rebuild runs for affected locations

## Projection Behavior

The nearby directory uses a denormalized `providers` projection:

- one row per location
- includes organization and location display fields
- includes aggregated service metadata
- supports geospatial nearby lookup through the shared Supabase RPC

## Mobile Relationship

The mobile app does not sync the full national provider catalog to SQLite. It queries nearby provider pages remotely and caches the results locally.

## Samples

See `caremate-provider-ingestion/samples/README.md` and the sample workbooks for the expected upload sequence and UUID handoff process.
