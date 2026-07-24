# Connections

Patient ↔ provider connections are a **CRM contact record**, not an EMR link. Approving only creates / updates a `patient_provider_connections` row — no health data is shared yet.

## Bidirectional model

| Direction | How started | Who approves |
|-----------|-------------|--------------|
| Patient → provider | Mobile Nearby provider detail → **Connect with provider** | Provider staff on `/app/patients/requests` (inbound) |
| Provider → patient | Portal Connection requests → CareMate Patient ID | Patient in CareMate → **Me → Connections → Provider connection requests** |

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting the other party |
| `approved` | Connected |
| `rejected` | Declined; **`rejection_reason` required** |

Column `initiated_by` (`patient` \| `provider`) records who opened the request. The **other** party approves.

### Rules

- **One row per** `(patient_id, organization_id)` forever (unique constraint).
- Re-request after **reject** is **blocked** (RPCs raise; UI does not show Connect again).
- Reject / decline / cancel-outbound requires a non-empty **`rejection_reason`**.
- Patients may only **request** a connection when the org is verified (`provider_profiles.verification_status = verified`). Unverified listings do not show the Connect button.
- Provider-initiated requests appear in portal as “Awaiting patient”; staff may cancel with a reason (reject without approve).

## Portal UI (`/app/patients/requests`)

1. **Request a connection** — CareMate Patient ID (`profiles.patient_id`, 12 digits) + optional note → RPC `request_provider_connection_by_caremate_id`.
2. **Awaiting your review** — `pending` + `initiated_by = patient` → Approve / Reject (+ reason).
3. **Awaiting patient** — `pending` + `initiated_by = provider` → Cancel (+ reason) only.

Approved patients appear under `/app/patients`.

## Mobile UI

| Surface | Behavior |
|---------|----------|
| Nearby → provider detail | Connect button only when org is verified and no existing connection row |
| Me → Connections | Hub |
| Me → Connections → Connected providers | Approved list |
| Me → Connections → Provider connection requests | Inbound pending from providers; Approve / Decline (+ reason) |

Catalog pin → org: `organization_id` on Nearby RPC / `providers.attributes.organization_id`.

Verification check: RPC `is_provider_org_verified(org_id)` (patients cannot read full `provider_profiles` under RLS).

## RPCs

| RPC | Caller | Purpose |
|-----|--------|---------|
| `request_patient_provider_connection` | Patient (mobile) | Open pending row; requires verified org |
| `request_provider_connection_by_caremate_id` | Org staff (portal) | Lookup `profiles.patient_id` → open pending row |
| `is_provider_org_verified` | Authenticated | Boolean for Connect gating |

## Related

- Schema / migrations: [Data model](./data-model.md)
- Messaging (requires approved connection): [Messaging](./messaging.md)
- Claim sets verified: [Auth & claim](./auth-claim.md)
- Mobile notes: [`../../caremate-mobile/docs/provider-model.md`](../../caremate-mobile/docs/provider-model.md)
