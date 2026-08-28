# Provider Platform — Strategy vs shipped gaps

Source: **CareMate Provider Platform Strategy v1.0** (`caremate-docs/CareMate Provider Platform Strategy.pdf`), compared to `caremate-provider-portal`, mobile provider engagement, catalog ingest, and Supabase. Captured **August 2026**; **updated 3 Aug 2026** after portal modules / appointments / lab work.

## Headline

Strategy aims at a **modular Provider Platform** (core + lab / pharmacy / appointments first) so non-EHR practices can join the PHIN without CareMate becoming “another EHR.”

Core engagement spine is shipped. Portal now has a **module activation** surface, fuller **Appointments**, and an optional **Laboratory** workflow. Patient registry depth and mobile lab/booking remain deferred.

## Status legend

| Status | Meaning |
|--------|---------|
| Shipped | Matches strategy intent for MVP |
| Partial | Present but thinner than strategy |
| Gap | Expected by strategy roadmap, not built |
| Future (doc) | Explicitly later phase in strategy |

## Core Platform (strategy “every provider”)

| Capability | Status | Strategy intent | Today | Gap |
|------------|--------|-----------------|-------|-----|
| Patient Registry | Partial | Search, register, view CareMate profiles, link local IDs | Connected patients list + detail by CareMate ID | No provider-side patient create/search beyond connected CRM; no local record linking (left as-is by product choice) |
| Emergency Profile Access | Shipped | Allergies, conditions, meds, contacts, blood group with consent | FHIR Consent–aligned emergency grant; portal shows profile when consented | Meds not on emergency card; no emergency-workflow override path |
| Secure Messaging | Partial | DM, file sharing, notifications, care coordination → telemedicine later | Org threads + **Private Care Team** DMs + push; documents separate | Voice/video hours reserved on plans; telemedicine not started |
| Billing | Partial | Invoicing, payments, insurance claims | **Private Care Team** org plans (Paystack NGN; SoftLyft catalog) — separate from patient Premium | Clinical/insurance billing still Phase 3 |
| Document Management | Partial | Labs, imaging, referrals, discharge → longitudinal record with consent | Bidirectional document vault + signed URLs | No consent-gated longitudinal publish; no DocumentReference FHIR export |

## Capability modules

| Capability | Status | Strategy intent | Today | Gap |
|------------|--------|-----------------|-------|-----|
| Appointments | Partial | Availability, scheduling, online booking, check-in, reminders | Portal: availability windows, staff schedule, request queue, check-in | Patient online booking / reminders; mobile create UI deferred |
| Laboratory | Partial | Order → sample → process → validate → report → notify → share | Portal module (opt-in): catalog, orders, results, validation, report timestamp | Patient notify/share in app; FHIR DiagnosticReport; analyzer integrations |
| Pharmacy | Gap | Rx, dispensing, inventory, refills | Catalog type only | Entire pharmacy module (Phase 2) |
| Clinical Records | Future | Consults, diagnoses, notes, vitals, procedures | None in provider portal | Strategy future; portal MVP out of scope |
| Billing | Future | Invoicing, payments, insurance claims | Private Care Team org subscriptions shipped; no clinical claims | Strategy Phase 3 clinical billing |
| Inventory | Future | Med/lab stock, reorder, expiry | None | Strategy Phase 3 |
| Referrals | Gap | Referral network between providers | Activity spine only | Strategy Phase 3 |
| Telemedicine | Future | Video/voice, AI summaries | Messaging only | Strategy Phase 4 |
| Analytics | Partial | Provider insights module | Light engagement counters | No clinical/ops/financial reporting |
| Integrations | Partial | FHIR with existing EHRs; open APIs; marketplace | Inbound catalog ingest; FHIR publish-out stubbed | No live EHR FHIR exchange; Open APIs / marketplace |

## Platform mechanics

| Capability | Status | Strategy intent | Today | Gap |
|------------|--------|-----------------|-------|-----|
| Capability-based configuration | Partial | “What services?” → auto-enable modules | Catalog + Settings → Modules (`provider_org_modules`); core modules default ON; Lab activatable | Auto-enable from org services; more modules on activate UI |
| FHIR resource generation | Partial | Workflows emit Appointment, Observation, DiagnosticReport, etc. | Catalog Org/Location/HealthcareService; Consent-shaped rows | No Encounter / Observation / DiagnosticReport from provider workflows yet |
| Staff / org ops | Partial | Roles, multi-site | RBAC + claim + mark-as-staff; multi-org switcher | Staff invite UI; deeper multi-location ops |

## Roadmap alignment (strategy)

| Phase | Intent | Notes |
|-------|--------|-------|
| **1** | Core + Appointments + Laboratory | Core partial; appointments portal-complete (mobile deferred); lab portal MVP opt-in |
| **2** | Pharmacy, Clinical Records (initial), richer notifications | Not started as modules |
| **3** | Billing, Inventory, Referrals, advanced reporting | Not started |
| **4** | Telemedicine, remote monitoring, AI docs | Not started |
| **5** | Open APIs, marketplace, partner apps | Not started |

## What was strong at capture

- Bidirectional patient↔org connections with verified claim gate
- FHIR Consent–shaped emergency sharing (opt-in)
- Org messaging + staff DMs + push; shared document vault
- National catalog → Nearby discovery; website provider marketing/docs
- Positioning matches “not another EHR” — engagement channel, not clinical ops HMS

## Highest-impact remaining gaps

1. **Patient Registry depth** — register/search/link local identities (intentionally deferred)
2. **Lab → patient surface** — notify/share results in mobile; FHIR DiagnosticReport
3. **Appointments → patient booking / reminders** (mobile + notifications)
4. **Service → capability packing** — auto-activate modules from catalog services
5. **EHR FHIR integration path** — live bidirectional exchange

## Related docs

- [Modules](./modules.md)
- [Connections & consent](./connections.md)
- [Data model](./data-model.md)
- [Architecture](./architecture.md)
