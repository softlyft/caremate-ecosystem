# CareMate Care Portal Docs

**Care Portal** for providers and payers. Provider workspace is a patient **engagement** channel — not an HMS, LIMS, pharmacy system, or EHR. Payer workspace lives under `/payer/*` (org profile, provider/patient connections, documents, messages).

Same Supabase project as the CareMate mobile app and SoftLyft admin portal. Provider catalog identity reuses `provider_organizations`; portal-facing fields live in `provider_profiles`. Payers use parallel `payer_*` tables.

## Quick links

| Topic | Read |
|-------|------|
| Positioning, package layout, routes | [Architecture](./architecture.md) |
| Claim, login, RBAC | [Auth & claim](./auth-claim.md) |
| Bidirectional connections, verification gate | [Connections](./connections.md) |
| Org ↔ patient Messages + DMs | [Messaging](./messaging.md) |
| Private Care Team plans (Paystack) | [Provider plans](./provider-plans.md) |
| Tables, migrations, RPCs | [Data model](./data-model.md) |
| Capability modules, appointments, documents | [Modules](./modules.md) |
| Strategy vs shipped gaps | [Provider strategy gaps](./provider-strategy-gaps.md) |
| Local setup, env, scripts | [Development](./development.md) |
| AWS Amplify hosting (monorepo) | [`../../docs/amplify-hosting.md`](../../docs/amplify-hosting.md) · [`../amplify.yml`](../amplify.yml) |
| Security (claim OTP, uploads, headers) | [`../../docs/security.md`](../../docs/security.md) |
| Manual verification checklist | [QA testing](./qa-testing.md) |

## In scope (MVP)

- Patient ↔ provider **connections** (CRM contact — no clinical data sharing yet)
- Provider ↔ payer **connections** (claim-email request; both orgs must be verified; portal inbox only)
- Patient ↔ payer **connections** (mobile Health Insurance Directory + CareMate ID from payer portal; verified payers only for patient Connect; disconnect either side)
- Request connection by CareMate Patient ID; approve / reject with reason
- **Messages** to connected patients (compose + two-way threads; push via `notify-message`)
- Mark connected CareMate users as organization **staff** (optional company contact fields)
- **Private Care Team** seats (plan-gated) so designated staff can DM patients; org Messages stay free
- Secure document upload to a patient (patients view under Me → Documents; **in-app + push** via `notify-provider-document`)
- Patients can also upload their own files and link an org later when connected
- Appointment **scheduling** in portal (availability, staff schedule, request queue, check-in)
- **Documents** for sharing lab results (PDF), prescriptions, and other clinical files
- Org profile + claim-time verification badge

Direct (person-to-person) chat in the **CareMate mobile app** requires the staff peer to be on the org **Private Care Team** (not merely marked as staff). See [Messaging](./messaging.md) and [Provider plans](./provider-plans.md).

## Out of scope

Billing, inventory, clinical notes / EMR, pharmacy stock, insurance claims, replacing the provider’s HMS. Structured lab order workflows and mobile appointment booking UI are deferred — use Documents for file sharing.

## Related docs

| Surface | Docs |
|---------|------|
| Monorepo overview | [`../../README.md`](../../README.md) |
| Package entry README | [`../README.md`](../README.md) |
| Mobile provider model / Nearby | [`../../caremate-mobile/docs/provider-model.md`](../../caremate-mobile/docs/provider-model.md) |
| SoftLyft admin portal | [`../../caremate-admin-portal/docs/README.md`](../../caremate-admin-portal/docs/README.md) |
| Shared Supabase | [`../../supabase/docs/README.md`](../../supabase/docs/README.md) |
| Public marketing + provider guide | [`../../caremate-website/README.md`](../../caremate-website/README.md) · `/providers`, `/providers/guide` |

## Source areas

| Area | Path |
|------|------|
| Routes | `src/app/` |
| Domains (repos + server actions) | `src/domains/` |
| Auth / Supabase clients | `src/lib/` |
| Ops bootstrap | `scripts/` |
| Local TS until `db:types` regen | `src/types/database.ts` |
