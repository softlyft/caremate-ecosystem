# Connections

Patient ↔ provider connections are a **CRM contact record**, not an EMR link. Approving a connection does **not** share clinical data — patients grant **FHIR Consent–aligned** privacy directives from a CareMate (and future custom) consent registry.

## Consent model

```
consent_definitions          → catalog (system + future org-custom)
patient_provider_consents    → FHIR Consent–shaped grants (source of truth)
patient_provider_connections.shared_scopes  → denormalized permit cache for RLS
```

### `consent_definitions`

| Field | Notes |
|-------|--------|
| `code` | Machine id in the scopes cache (`emergency`, later `vitals`, …) |
| `source` | `system` (CareMate) or `organization` (future custom) |
| `organization_id` | `null` for system; set for org-authored definitions |
| `fhir_scope` | Default `patient-privacy` |
| `fhir_category` / `fhir_policy_rule` | FHIR Consent category + OPTIN policy |
| `data_class` | Logical coverage (`emergency_profile`, …) |

Seeded today: system `emergency` → emergency profile; system `messaging` → secure messaging (auto-granted on connection approve).

### `patient_provider_consents` (FHIR Consent mapping)

| Column | FHIR |
|--------|------|
| `status` | `active` = granted; `inactive` = revoked |
| `fhir_scope` | Consent.scope |
| `provision_type` | Consent.provision.type (`permit`) |
| `purpose` | PurposeOfUse (default `TREAT`) |
| `patient_id` / `organization_id` | patient + actor (recipient org) |
| `granted_at` / `revoked_at` | dateTime / period end |

### `shared_scopes` (cache)

| Scope | Meaning |
|-------|---------|
| `basic` | Always present — CRM identity only (not a Consent) |
| `messaging` | Auto-granted when connection becomes `approved`; patient may revoke/re-grant. Required for org ↔ patient messaging. |
| other codes | Mirror of **active** permit definition codes (e.g. `emergency`) |

- **Approve** (either party) runs a DB trigger that inserts/reactivates an active **messaging** consent (`source = system`).
- **Reject / cancel** while pending permanently deletes any messaging consent rows for that connection.
- Patients manage consent on **Me → Connections → Connected providers → [provider] → Add consent**.
- Portal patient detail shows emergency data only when `'emergency' ∈ shared_scopes` (synced from an active consent).
- Only patients write consent rows via the app; system messaging grant uses a security-definer trigger. A DB trigger refreshes `shared_scopes`. Direct scope edits by non-patients are blocked (except the sync path).

## Bidirectional model

| Direction | How started | Who approves |
|-----------|-------------|--------------|
| Patient → provider | Mobile Nearby provider detail → **Connect with provider** | Provider staff on `/app/patients/requests` (inbound) |
| Provider → patient | Portal Connection requests → CareMate Patient ID | Patient in CareMate → **Me → Connections → Provider connection requests** |

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting the other party |
| `approved` | Connected |
| `rejected` | Declined by the non-initiator; **`rejection_reason` required** |
| `cancelled` | Pending request withdrawn by the initiator; reason required |
| `disconnected` | Approved link ended by either party; reason optional |

Column `initiated_by` (`patient` \| `provider`) records who opened the request. The **other** party approves or rejects. The **initiator** cancels outbound pending requests (not reject).

## Discovery keys

Each connection type resolves the target org or person differently. Do not mix identifiers across flows.

| Connection | Discovery key | Resolves to |
|------------|---------------|-------------|
| Patient ↔ provider (portal → patient) | **CareMate ID** (`profiles.patient_id`, 12 digits) | Patient user |
| Patient ↔ provider (mobile → org) | Nearby catalog **`organization_id`** on the provider pin | Verified `provider_organizations` row |
| Provider ↔ payer (B2B) | **Claim / verification email** | Verified payer or provider org |
| Patient ↔ payer (mobile → payer) | **`payer_directory.id`** (Health Insurance Directory) | Verified `payer_organizations` row |
| Patient ↔ payer (payer portal → patient) | **CareMate ID** | Patient user |

**Nearby “insurance” org type ≠ `payer_organizations`.** The Nearby catalog may list facilities tagged as insurance for map discovery; those are still `provider_organizations` / catalog pins. Supported insurers on a provider detail come from approved **`provider_payer_connections`**, not from Nearby type alone.

Push notifications for patient ↔ provider lifecycle events use Edge Function `notify-provider-connection` (Expo push to patient devices when applicable; portal activity covers provider-side inbound).

### Rules

- **One row per** `(patient_id, organization_id)` forever (unique constraint).
- Re-request after **reject** is **blocked** (RPCs raise; UI does not show Connect again).
- **Cancelled** or **disconnected** rows may be reopened via a new request RPC.
- Reject / cancel-outbound requires a non-empty reason; disconnect allows an optional reason.
- Patients may only **request** a connection when the org is verified (`provider_profiles.verification_status = verified`). Unverified listings do not show the Connect button.
- Provider-initiated requests appear in portal as “Awaiting patient”; staff may **cancel** with a reason (not reject).

## Portal UI (`/app/patients/requests`)

1. **Request a connection** — CareMate Patient ID (`profiles.patient_id`, 12 digits) + optional note → RPC `request_provider_connection_by_caremate_id`.
2. **Awaiting your review** — `pending` + `initiated_by = patient` → Approve / Reject (+ reason) via `respond_patient_provider_connection`.
3. **Awaiting patient** — `pending` + `initiated_by = provider` → Cancel (+ reason) via `cancel_pending_patient_provider_connection`.

Approved patients appear under `/app/patients`. Staff may **disconnect** from the patient detail page via `disconnect_patient_provider_connection`.

## Mobile UI — supported payers on provider detail

Nearby (and other) provider detail screens list **approved** `provider_payer_connections` as supported insurers. Tap through to the Health Insurance Directory detail. Pending/rejected links stay private to Care Portal org members.

## Mobile UI

| Surface | Behavior |
|---------|----------|
| Nearby → provider detail | Connect button only when org is verified and no existing connection row |
| Me → Connections | Hub |
| Me → Connections → Connected providers | Approved list; tap to view + manage consent |
| Me → Connections → Connected providers → [provider] | Add / remove CareMate consents (emergency profile first) |
| Me → Connections → Provider connection requests | Inbound pending from providers; Approve / Decline (+ reason) |

Catalog pin → org: `organization_id` on Nearby RPC / `providers.attributes.organization_id`.

Verification check: RPC `is_provider_org_verified(org_id)` (patients cannot read full `provider_profiles` under RLS).

## RPCs

| RPC | Caller | Purpose |
|-----|--------|---------|
| `request_patient_provider_connection` | Patient (mobile) | Open pending row; requires verified org |
| `request_provider_connection_by_caremate_id` | Org staff (portal) | Lookup `profiles.patient_id` → open pending row |
| `respond_patient_provider_connection` | Non-initiator | Approve or reject pending |
| `cancel_pending_patient_provider_connection` | Initiator | Withdraw pending outbound/inbound (by initiator) |
| `disconnect_patient_provider_connection` | Either party | End approved link |
| `is_provider_org_verified` | Authenticated | Boolean for Connect gating |

## Related

- Schema / migrations: [Data model](./data-model.md)
- Messaging (requires approved connection): [Messaging](./messaging.md)
- Claim sets verified: [Auth & claim](./auth-claim.md)
- Mobile notes: [`../../caremate-mobile/docs/provider-model.md`](../../caremate-mobile/docs/provider-model.md)

---

# Provider ↔ payer connections

Verified provider and payer organizations can link in Care Portal as a **B2B CRM contact** (no clinical data or claims payload in this pass). Notifications are **portal requests pages only** in this pass (no email/push, and no shared activity feed like patient↔provider). Staff discover inbound requests by opening `/app/payers/requests` or `/payer/providers/requests`.

## Bidirectional model

| Direction | How started | Who approves |
|-----------|-------------|--------------|
| Provider → payer | `/app/payers/requests` → payer claim email | Payer staff on `/payer/providers/requests` |
| Payer → provider | `/payer/providers/requests` → provider claim email | Provider staff on `/app/payers/requests` |

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting the other org |
| `approved` | Connected |
| `rejected` | Declined by the non-initiator; **`rejection_reason` required** |
| `cancelled` | Pending request withdrawn by the initiator |
| `disconnected` | Approved link ended by either org |

Column `initiated_by` (`provider` \| `payer`) records who opened the request. The **other** party approves or rejects. The **initiator** cancels outbound pending requests.

### Rules

- **One row per** `(provider_organization_id, payer_organization_id)` forever.
- Re-request after **reject** is **blocked**.
- **Cancelled** or **disconnected** rows may be reopened via request RPCs.
- Both orgs must be **verified** (`is_provider_org_verified` / `is_payer_org_verified`).
- Write roles (`can_write_*`) may request / approve / reject.
- Lookup uses **claim/verification contact email**:
  - Payer → `payer_organizations.email`
  - Provider → `provider_profiles.email` or a location email (same resolution as SoftLyft claim)

## Portal UI

| Surface | Purpose |
|---------|---------|
| `/app/payers/requests` | Request by payer email + inbound/outbound pending |
| `/app/payers` | Approved payer connections (disconnect) |
| `/payer/providers/requests` | Request by provider email + pending queues |
| `/payer/providers` | Approved provider connections (disconnect) |
| `/payer/patients/requests` | Request by CareMate ID + inbound/outbound pending |
| `/payer/patients` | Approved patient connections (disconnect) |

## RPCs

| RPC | Caller | Purpose |
|-----|--------|---------|
| `request_provider_payer_connection_by_email` | Provider writers | Match verified payer by claim email |
| `request_payer_provider_connection_by_email` | Payer writers | Match verified provider by claim email |
| `cancel_pending_provider_payer_connection` | Initiator | Withdraw pending request |
| `disconnect_provider_payer_connection` | Either org | End approved link |
| `request_payer_patient_connection_by_caremate_id` | Payer writers | Open patient↔payer pending row |
| `respond_patient_payer_connection` | Non-initiator | Approve or reject pending patient↔payer |
| `cancel_pending_patient_payer_connection` | Initiator | Withdraw pending patient↔payer |
| `disconnect_patient_payer_connection` | Either party | End approved patient↔payer |
| `find_verified_*_org_id_by_claim_email` | Helpers | Resolution used by the request RPCs |

Approve / reject for provider↔payer still use direct `UPDATE` under RLS (trigger-enforced). Patient↔provider and patient↔payer lifecycle actions use security-definer RPCs.