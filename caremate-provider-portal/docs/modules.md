# Capability modules

Provider portal features are packaged as **modules** so orgs can turn optional capabilities on without CareMate becoming a full EHR.

## Catalog

Defined in `src/domains/modules/catalog.ts`.

| Module | Default | Activatable in Settings | Routes |
|--------|---------|-------------------------|--------|
| Dashboard | On | No | `/app/dashboard` |
| Patients | On | No | `/app/patients` |
| Payers | On | No | `/app/payers` |
| Appointments | Off | No | `/app/appointments` |
| Documents | On | No | `/app/documents` |
| Messaging | On | No | `/app/broadcasts` |
| Analytics | On | No | `/app/analytics` |
| Organization | On | No | `/app/organization` |

Missing `provider_org_modules` row → catalog `defaultEnabled`.

## Activation UI

**Settings → Modules** (`/app/settings/modules`). Activatable modules appear here when shipped. Owners/admins toggle; nav and `requireModule()` gate routes.

## Documents (clinical file sharing)

Use **Documents** (`/app/documents`) for lab results (PDF), prescriptions, imaging reports, and other files shared with connected patients. Document types include `lab_result`, `prescription`, and `imaging_report`. Structured extraction and mapping are deferred.

## Appointments (portal)

- **Schedule** — staff-created visits for connected patients (`source = provider_scheduled`)
- **Requests** — inbound patient queue
- **Availability** — weekly windows (`provider_appointment_availability`)
- Statuses include `checked_in` / `cancelled`

Mobile appointment UI is intentionally unchanged.

## Extending

1. Add key + definition to `PROVIDER_MODULES` (set `activatable` / `defaultEnabled`)
2. Gate pages with `requireModule('…')`
3. Add nav entry in `AppShell` (uses catalog `module` field)
4. Ship migration for domain tables if needed
5. Optionally list on Settings when ready for self-serve activation

## Related

- [Strategy gaps](./provider-strategy-gaps.md)
- [Data model](./data-model.md)
- Migration (create): `supabase/migrations/20260803120000_provider_modules_appointments_lab.sql`
- Migration (drop lab tables): `supabase/migrations/20260831150000_drop_provider_laboratory_module.sql`
