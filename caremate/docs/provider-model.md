# Provider model

[← Back to index](./README.md)

## Today vs tomorrow

| Today | Model |
|-------|--------|
| Nearby “Provider” | One core entity: **`Provider`** |
| Tomorrow’s specialties | Same row, discriminated by **`type`** |

```
Provider (core)
  ├── type: hospital | clinic | pharmacy | laboratory
  │         | telemedicine | blood_bank | ambulance
  │         | (+ dentist, mental_health)
  ├── shared fields: name, address, phone, geo, favorite, …
  └── attributes: { … }   ← type-specific, flexible JSON
```

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

Suggested shapes (convention only — not enforced in TS yet):

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

FHIR seeds may supply attributes via extension  
`https://caremate.app/fhir/StructureDefinition/provider-attributes` (`valueString` JSON).

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
| Repository | `domains/providers/repository.ts` |
| FHIR seed map | `domains/providers/utils/fhir-providers.ts` |
| Domain exports | `domains/providers/index.ts` |
| SQLite | `database/schema.ts` → `providers.attributes` |
