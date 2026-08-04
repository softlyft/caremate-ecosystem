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

Nearby ranking needs a lat/lng for `nearby_providers`. Coordinates come from `resolveNearbyCoords()` in `domains/providers/location.ts`.

```
On Nearby open / refresh
  ├── locationMode precise + permission granted
  │     → capture fresh GPS sample (exact lat/lng + accuracy/altitude/heading/speed)
  │     → save in SQLite user_location_samples (keep newest 20)
  │     → sync to Supabase when signed in
  │     → query nearby_providers (default limit 15, radius 25 km)
  ├── location off / denied / GPS error
  │     → use latest local sample if present (banner: last known)
  │     → otherwise empty state (enable location or search by name)
  └── search box text present
        → search_providers_by_name (live CareMate catalog, no geo)
```

Country/state capital pins are **not** used to invent Nearby results. Approximate region pins remain available elsewhere (news, localization), but Nearby only ranks from a real GPS sample or the user’s last known sample.

Permission UX lives in onboarding (`/(auth)/onboarding/location`) and the Nearby enable-location empty state / last-known banner. Copy frames results as **CareMate providers** (in-app catalog), not open-world maps.

**Do not** create separate `Hospital` / `Pharmacy` tables for Phase 1–2. Add specialized columns only when a field is queried/filtered often enough to leave JSON.

## Types

Canonical list: `src/domains/providers/types.ts`  
Mirrored in portal `constants/content.ts` and ingest `PROVIDER_TYPES`.

| Type | Label | Nearby filter |
|------|-------|---------------|
| `hospital` | Hospital | ✅ |
| `clinic` | Clinic | ✅ |
| `pharmacy` | Pharmacy | ✅ |
| `laboratory` | Laboratory | ✅ |
| `imaging_centre` | Imaging Centre | ✅ |
| `dentist` | Dental Clinic | ✅ |
| `eye_care` | Eye Clinic | ✅ |
| `insurance` | Insurance | — (data model only; not in Nearby chips) |
| `blood_bank` | Blood Bank | — |
| `ambulance` | Ambulance Service | — |
| `telemedicine` | Telemedicine | — |
| `mental_health` | Mental Health | — |
| `home_care` | Home Care | — |
| `medical_equipment` | Medical Equipment & Supplies | — |
| `government_health` | Government Health Services | — |
| `ngo` | NGO | — |

`PRIMARY_PROVIDER_TYPES` drives the Nearby chip row (order matches the product category list above). Other types remain valid in the data model / ingest for later.

## Provider Portal (engagement)

Patient ↔ provider **connections**, documents, **messages**, and appointment requests live in [`caremate-provider-portal`](../../caremate-provider-portal/). Catalog discovery (`providers` / FHIR resources) stays in ingest + admin portal; engagement reuses `provider_organizations` and does not replace Nearby pins.

| Topic | Doc |
|-------|-----|
| Docs index | [`docs/README.md`](../../caremate-provider-portal/docs/README.md) |
| Bidirectional connections | [`docs/connections.md`](../../caremate-provider-portal/docs/connections.md) |
| Messaging (org threads + DMs) | [`docs/messaging.md`](../../caremate-provider-portal/docs/messaging.md) |
| Claim + verification | [`docs/auth-claim.md`](../../caremate-provider-portal/docs/auth-claim.md) |

**Connections (shipped):** either side can request; the other party approves (required `rejection_reason` if declined). One connection row per patient↔organization. **Connecting does not share clinical data** — patients grant FHIR Consent–aligned directives from **Me → Connections → Connected providers → [provider] → Add consent** (registry starts with emergency profile; `shared_scopes` is a denormalized cache). Patient: Nearby detail → Connect (verified claimed orgs only); **Me → Connections**. Provider: CareMate Patient ID under Connection requests.

**Documents (shipped):** patients upload under **Me → Documents** (org optional; link later after connect); providers upload to connected patients; both appear in the same list (signed URL open). Patient-sourced files are visible to a provider only after the patient links that org and the connection is approved.

**Messages (shipped):** portal **Messages** compose + two-way threads; mobile Home → **Messages** inbox / reply / New message (DMs). Push via Edge Function `notify-message` when the device is registered. Staff elevation: connected patient → Mark as staff (optional company fields).

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
`https://getcaremate.com/fhir/StructureDefinition/provider-attributes` (`valueString` JSON).

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
