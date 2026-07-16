# Provider model

[← Back to index](./README.md)

## Today vs tomorrow

| Layer | Model |
|-------|--------|
| FHIR / ingest (write) | `Organization` 1→N `Location` 1→N `HealthcareService` |
| Nearby / mobile (read) | **Online geo query** (`nearby_providers` RPC) + small SQLite cache |

```
provider_organizations          id = uuid (gen_random_uuid)
  └── provider_locations        id = uuid → providers.id = location_id
        └── provider_healthcare_services   id = uuid (listed in attributes.services)

Mobile Nearby
  ├── RPC nearby_providers(lat, lng, radius, type, search, limit)
  ├── SQLite cache: last geo page + favorites snapshots
  └── Does NOT mirror the full national catalog into SQLite
```

**Scale note:** Nigeria alone can exceed 50k facilities. Full `select('*')` sync into SQLite is not used. Prefer geo pages (~100 pins) and keep favorites hydrated by id.

Excel ingest: **non-UUID** identifier → insert; **UUID** → update existing row. Copy IDs from the portal after the first upload.

## Mobile runtime behavior

Current mobile provider behavior is:

1. Query `nearby_providers` when online
2. Cache returned rows in SQLite
3. Fall back to cached provider rows offline
4. Keep user favorites merged locally through `provider_favorites`

Bundled seed rows are not used at runtime. `AppProviders` purges legacy bundled/demo provider rows during bootstrap. Nearby availability comes only from the Supabase RPC (or the last cached geo page); an empty RPC/cache result is shown as empty state in the UI.

## Geo strategy (Nearby coordinates)

Nearby ranking always needs a lat/lng for `nearby_providers`. Coordinates come from `resolveNearbyCoords()` in `domains/providers/location.ts`.

```
Onboarding locationMode
  ├── precise + permission granted → live GPS
  ├── precise + denied / GPS error → approximate pin
  └── approximate / skipped        → approximate pin
```

**Approximate pin = selection-based, not a hard-coded Lagos default.**

| Selection | Pin used |
|-----------|----------|
| Country + Nigerian state | That state's capital / major-city coords (`nigeria-state-coords.ts`) |
| Country only | Country capital-area coords from `african-countries.ts` / country config |
| No country yet (Global / unset) | International fallback (`0, 0`) — Nearby may be empty until region is chosen |

There is **no** Nigeria bounding-box gate. When precise GPS is available, it is used even if the device is outside the selected country. Approximate mode deliberately uses the user's onboarding country/state so results stay relevant without sharing live location.

Permission UX lives in onboarding (`/(auth)/onboarding/location`): enable precise GPS or continue with the selected-region approximate pin. Nearby shows a caption when results are ranked from that approximate pin.

**Do not** create separate `Hospital` / `Pharmacy` tables for Phase 1–2. Add specialized columns only when a field is queried/filtered often enough to leave JSON.

## Types

Canonical list: `src/domains/providers/types.ts`

| Type | Label | Primary Nearby filter |
|------|-------|------------------------|
| `hospital` | Hospital | ✅ |
| `clinic` | Clinic | ✅ |
| `pharmacy` | Pharmacy | ✅ |
| `laboratory` | Laboratory | ✅ |
| `telemedicine` | Telemedicine | ✅ |
| `blood_bank` | Blood Bank | ✅ |
| `ambulance` | Ambulance | ✅ |
| `dentist` | Dentist | secondary |
| `mental_health` | Mental Health | secondary |

`PRIMARY_PROVIDER_TYPES` drives the Nearby chip row. Secondary types remain valid on seeds/API.

## Flexible attributes

Column: `providers.attributes` (SQLite text JSON, default `{}`).

Ingest always writes (at least):

```ts
{
  organization_id: string;
  location_id: string;
  services: Array<{ id: string; name: string; type?: string; active?: boolean }>;
}
```

Suggested type-specific shapes (convention only — not enforced in TS yet):

```ts
// hospital
{ emergencyDept?: boolean; beds?: number; traumaLevel?: string }

// pharmacy
{ open24h?: boolean; delivery?: boolean }

// laboratory
{ homeCollection?: boolean; tests?: string[] }

// telemedicine
{ platforms?: string[]; languages?: string[] }

// ambulance
{ coverageArea?: string; advancedLifeSupport?: boolean }

// blood_bank
{ components?: string[]; appointmentRequired?: boolean }
```

FHIR seeds / ingest may supply attributes via extension  
`https://caremate.app/fhir/StructureDefinition/provider-attributes` (`valueString` JSON).

Canonical FHIR shape for a provider catalog row:

- **Organization** — operator identity
- **Location** — physical place + coordinates
- **HealthcareService** — offered service (`providedBy` → Organization, `location` → Location)

## When to promote an attribute

Move a key out of `attributes` into a real column when you need:

- Filtering / sorting in SQL (e.g. “open 24h pharmacies near me”)
- Indexes or RLS rules
- Strong validation across clients

Until then, keep the core stable.

## Related code

| Piece | Path |
|-------|------|
| Type catalog | `domains/providers/types.ts` |
| Repository (geo + cache) | `domains/providers/repository.ts` |
| GPS / approximate pin resolver | `domains/providers/location.ts` |
| Country capital pins | `domains/localization/african-countries.ts` |
| Nigerian state pins | `domains/localization/nigeria-state-coords.ts` |
| FHIR seed map | `domains/providers/utils/fhir-providers.ts` |
| Nearby RPC | `supabase/migrations/20260715200000_nearby_providers_rpc.sql` |
| SQLite | `database/schema.ts` → `providers.attributes` |
