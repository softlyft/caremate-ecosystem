# Capability modules

Provider portal features are packaged as **modules** so orgs can turn optional capabilities on without CareMate becoming a full EHR.

## Catalog

Defined in `src/domains/modules/catalog.ts`.

| Module | Default | Activatable in Settings | Routes |
|--------|---------|-------------------------|--------|
| Dashboard | On | No | `/app/dashboard` |
| Patients | On | No | `/app/patients` |
| Appointments | On | No | `/app/appointments` |
| Documents | On | No | `/app/documents` |
| Messaging | On | No | `/app/broadcasts` |
| Analytics | On | No | `/app/analytics` |
| Organization | On | No | `/app/organization` |
| Laboratory | Off | Yes | `/app/lab` |

Missing `provider_org_modules` row → catalog `defaultEnabled`.

## Activation UI

**Settings → Modules** (`/app/settings/modules`). Only activatable modules are listed (Laboratory for now). Owners/admins toggle; nav and `requireModule()` gate routes.

## Appointments (portal)

- **Schedule** — staff-created visits for connected patients (`source = provider_scheduled`)
- **Requests** — inbound patient queue
- **Availability** — weekly windows (`provider_appointment_availability`)
- Statuses include `checked_in` / `cancelled`

Mobile appointment UI is intentionally unchanged.

## Laboratory

Activate via Settings, then:

1. **Test catalog** (`/app/lab/tests`) — org-scoped definitions
2. **Orders** (`/app/lab`) — order for connected patients
3. **Workflow** — ordered → sample collected → processing → awaiting validation → validated → reported
4. Enter item results during processing; validate; report (portal-only notification timestamp for now)

Tables: `lab_test_definitions`, `lab_orders`, `lab_order_items`.

## Extending

1. Add key + definition to `PROVIDER_MODULES` (set `activatable` / `defaultEnabled`)
2. Gate pages with `requireModule('…')`
3. Add nav entry in `AppShell` (uses catalog `module` field)
4. Ship migration for domain tables if needed
5. Optionally list on Settings when ready for self-serve activation

## Related

- [Strategy gaps](./provider-strategy-gaps.md)
- [Data model](./data-model.md)
- Migration: `supabase/migrations/20260803120000_provider_modules_appointments_lab.sql`
