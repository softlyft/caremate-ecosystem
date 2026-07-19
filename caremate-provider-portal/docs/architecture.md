# Architecture

## Positioning

CareMate Provider Portal is a **patient engagement** channel for organizations already (or soon) listed in the CareMate provider catalog.

Providers keep their clinical / ops systems. CareMate gives them a trusted way to connect with CareMate patients: connections, documents, broadcasts, and appointment requests — on the shared Supabase backend.

Every feature should answer: *How does this help providers build and maintain a trusted relationship with their patients?*

## Package

| | |
|--|--|
| Package | `caremate-provider-portal/` |
| Framework | Next.js App Router |
| Dev | `npm run provider-portal:dev` → http://localhost:4000 |
| Auth | Supabase Auth + `provider_org_members` |
| Data | Same Supabase project as mobile / admin portal |
| Org identity | Reuses `provider_organizations` (FHIR catalog); portal fields in `provider_profiles` |

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
│   ├── app/              routes (claim, login, /app/*)
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
| `/app/patients/[id]` | Patient profile (scoped), docs, timeline |
| `/app/appointments` | Appointment request queue |
| `/app/documents` | Upload / list shared documents |
| `/app/broadcasts` | Compose and send announcements |
| `/app/analytics` | Simple counts / growth |
| `/app/organization` | Org profile + verification badge |
| `/app/settings` | Session / org switcher settings |

Public: `/claim`, `/login`. Home redirects unauthenticated users to `/claim`.

## Engineering notes

- Server Components by default; Server Actions for mutations
- Modular `domains/*` repositories + actions; `components/` for UI
- Organization-level isolation via RLS (`is_provider_org_member`, `can_write_provider_org`, `can_manage_provider_org`)
- Connections + activity log are the spine for future HMS / referral integrations

## Related

- [Auth & claim](./auth-claim.md)
- [Connections](./connections.md)
- [Data model](./data-model.md)
