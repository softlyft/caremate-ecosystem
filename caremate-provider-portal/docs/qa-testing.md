# QA testing

Manual checklist for the Provider Portal MVP. Prefer a claimed org with a known catalog email and a mobile test user who has generated a CareMate Patient ID.

## Claim & login

| ID | Priority | Steps | Expected |
|----|----------|-------|----------|
| PP-01 | P0 | `/claim` with catalog contact email | Org matched; verification code shown (MVP) |
| PP-02 | P0 | Complete claim (code + password) | Signed in; owner membership; org profile **verified** |
| PP-03 | P0 | `/login` as claimed owner | Dashboard loads for that org |
| PP-04 | P1 | `/login` with Auth user but no membership | Blocked / no portal session |

## Connections (portal)

| ID | Priority | Steps | Expected |
|----|----------|-------|----------|
| PP-10 | P0 | Connection requests → enter valid CareMate ID → send | Pending under **Awaiting patient** |
| PP-11 | P0 | Invalid / unknown CareMate ID | Clear error; no row |
| PP-12 | P0 | Patient-initiated pending appears under **Awaiting your review** | Approve works; patient moves to Connected patients |
| PP-13 | P0 | Reject inbound without reason | Blocked; reason required |
| PP-14 | P0 | Reject inbound with reason | Status rejected; `rejection_reason` set |
| PP-15 | P0 | Cancel outbound with reason | Pending cleared as rejected |
| PP-16 | P1 | Re-request same patient after decline | Error: multiple requests not allowed |
| PP-17 | P1 | Viewer role | Cannot send / approve / reject |

## Connections (mobile companion)

| ID | Priority | Steps | Expected |
|----|----------|-------|----------|
| PP-20 | P0 | Me → Connections | Hub with Connected providers + Provider connection requests |
| PP-21 | P0 | Nearby detail for **verified** claimed org, no prior row | Connect button visible; request creates pending |
| PP-22 | P0 | Nearby detail for **unverified** (no claim) org | Connect section / button hidden |
| PP-23 | P0 | Decline provider request with reason | Required reason; inbound list updates |
| PP-24 | P1 | After reject, open same provider detail | No Connect button; declined state may show |

## Documents / broadcasts / appointments (smoke)

| ID | Priority | Steps | Expected |
|----|----------|-------|----------|
| PP-30 | P1 | Upload document for connected patient | Stored; visible on patient detail in portal |
| PP-30b | P0 | Patient: Me → Documents after upload | Document listed; tap opens file |
| PP-31 | P1 | Send broadcast to all connected | Recipients created; activity logged |
| PP-32 | P2 | Appointment request list | Status updates persist |

## Related

- [Connections](./connections.md)
- [Development](./development.md)
- Mobile Nearby / Me notes: [`../../caremate-mobile/docs/provider-model.md`](../../caremate-mobile/docs/provider-model.md)
