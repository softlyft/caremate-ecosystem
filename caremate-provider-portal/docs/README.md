# CareMate Provider Portal Docs

Patient **engagement** portal for healthcare organizations. Not an HMS, LIMS, pharmacy system, or EHR.

Same Supabase project as the CareMate mobile app and SoftLyft admin portal. Org catalog identity reuses `provider_organizations`; portal-facing fields live in `provider_profiles`.

## Quick links

| Topic | Read |
|-------|------|
| Positioning, package layout, routes | [Architecture](./architecture.md) |
| Claim, login, RBAC | [Auth & claim](./auth-claim.md) |
| Bidirectional connections, verification gate | [Connections](./connections.md) |
| Tables, migrations, RPCs | [Data model](./data-model.md) |
| Local setup, env, scripts | [Development](./development.md) |
| Manual verification checklist | [QA testing](./qa-testing.md) |

## In scope (MVP)

- Patient ↔ provider **connections** (CRM contact — no clinical data sharing yet)
- Request connection by CareMate Patient ID; approve / reject with reason
- Broadcasts to connected patients
- Secure document upload to a patient (patients view under Me → Documents in the app)
- Patients can also upload their own files and link an org later when connected
- Appointment **requests** (no calendar sync)
- Org profile + claim-time verification badge

## Out of scope

Billing, inventory, clinical notes / EMR, pharmacy stock, lab workflows, insurance claims, replacing the provider’s HMS.

## Related docs

| Surface | Docs |
|---------|------|
| Monorepo overview | [`../../README.md`](../../README.md) |
| Package entry README | [`../README.md`](../README.md) |
| Mobile provider model / Nearby | [`../../caremate/docs/provider-model.md`](../../caremate/docs/provider-model.md) |
| SoftLyft admin portal | [`../../caremate-portal/docs/README.md`](../../caremate-portal/docs/README.md) |
| Shared Supabase | [`../../supabase/docs/README.md`](../../supabase/docs/README.md) |
| Public marketing + provider guide | [`../../website/README.md`](../../website/README.md) · `/providers`, `/providers/guide` |

## Source areas

| Area | Path |
|------|------|
| Routes | `src/app/` |
| Domains (repos + server actions) | `src/domains/` |
| Auth / Supabase clients | `src/lib/` |
| Ops bootstrap | `scripts/` |
| Local TS until `db:types` regen | `src/types/database.ts` |
