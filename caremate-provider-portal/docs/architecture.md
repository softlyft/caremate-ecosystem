# Architecture

## Positioning

CareMate **Care Portal** is the engagement surface for care-network organizations. The **provider** workspace is a patient engagement channel for orgs listed in the CareMate provider catalog. The **payer** workspace is a parallel stub for insurers / HMOs / payers listed in `payer_organizations`.

Providers keep their clinical / ops systems. CareMate gives them a trusted way to connect with CareMate patients: connections, documents, messages, and appointment requests — on the shared Supabase backend.

Every provider feature should answer: *How does this help providers build and maintain a trusted relationship with their patients?*

## Package

| | |
|--|--|
| Package | `caremate-provider-portal/` (folder name unchanged) |
| Product name | Care Portal |
| Host | `app.getcaremate.com` |
| Framework | Next.js App Router |
| Dev | `npm run provider-portal:dev` → http://localhost:4000 |
| Auth | Supabase Auth + `provider_org_members` / `payer_org_members` |
| Data | Same Supabase project as mobile / admin portal |
| Provider identity | Reuses `provider_organizations`; portal fields in `provider_profiles` |
| Payer identity | `payer_organizations` + `payer_profiles` |

## MVP organization types

Portal onboarding / `provider_profiles.organization_type` supports:

Hospital · Clinic · Pharmacy · Laboratory · Imaging Centre · Blood Bank · Ambulance Service · Insurance / HMO

The mobile Nearby catalog may list additional public discovery types (e.g. NGO, Dental, Telemedicine). Those remain discovery labels; portal MVP tenants use the subset above.

## Layout

```
caremate-provider-portal/
├── docs/                 ← this docs set
├── scripts/              bootstrap membership (ops)
├── src/
│   ├── app/              routes (claim, login, /app/*, /payer/*)
│   ├── components/       UI + feature forms
│   ├── constants/        roles helpers
│   ├── domains/          repositories + server actions
│   ├── lib/              auth, supabase clients
│   └── types/            local Database overlay until db:types regen
└── package.json
```

## Authenticated routes (`/app/*`)

| Route | Purpose |
|-------|---------|
| `/app/dashboard` | Counts, recent activity, quick actions |
| `/app/patients` | Connected (approved) patients |
| `/app/patients/requests` | Connection requests (inbound + outbound + request-by-ID) |
| `/app/patients/[id]` | Patient profile (scoped), docs, timeline, **Mark as staff** |
| `/app/appointments` | Appointment request queue |
| `/app/documents` | Upload / list shared documents |
| `/app/broadcasts` | **Messages** — compose to connected patients + inbox |
| `/app/broadcasts/[id]` | Org ↔ patient thread (reply) |
| `/app/analytics` | Simple counts / growth |
| `/app/organization` | Portal profile + locations list |
| `/app/organization/locations/new` | Create catalog location |
| `/app/organization/locations/[id]` | Edit location + healthcare services |
| `/app/organization/locations/[id]/services/new` | Create healthcare service |
| `/app/organization/locations/[id]/services/[serviceId]` | Edit healthcare service |
| `/app/settings` | Session / org switcher settings |

Public: `/claim`, `/login`. Home redirects unauthenticated users to `/claim`.

## Catalog locations & services

Manage-role members (`owner` / `administrator`) create and update rows in `provider_locations` and `provider_healthcare_services` for the active org (same FK chain as spreadsheet ingest). Writes use `source: provider_portal` and call `rebuild_provider_projection_for_location` so Nearby `providers` pins stay in sync. Staff/viewer roles remain read-only on these screens.

### Profile vs catalog field ownership

| Live from catalog (Organization page derive-read) | Editable on `provider_profiles` |
|---------------------------------------------------|---------------------------------|
| Primary location phone / address | Website, description, logo, emergency contact, opening hours, organization type |
| Healthcare service names | Verification status (read-only badge; set on claim / admin) |
| Canonical org name (`provider_organizations`) | |
| **Claim contact email** (profile + all locations, kept identical) | Providers never edit. SoftLyft admin may edit only while `verification_status ≠ verified`. |

Legacy profile columns `phone`, `address`, and `services_offered` are no longer written by the portal UI (left as historical if present).

## Engineering notes

- Server Components by default; Server Actions for mutations
- Modular `domains/*` repositories + actions; `components/` for UI
- Organization-level isolation via RLS (`is_provider_org_member`, `can_write_provider_org`, `can_manage_provider_org`)
- Connections + activity log are the spine for future HMS / referral integrations

## Related

- [Auth & claim](./auth-claim.md)
- [Connections](./connections.md)
- [Messaging](./messaging.md)
- [Data model](./data-model.md)
