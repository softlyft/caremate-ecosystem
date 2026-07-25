# QA testing

Manual checklist for the Provider Portal MVP. Prefer a claimed org with a known catalog email and a mobile test user who has generated a CareMate Patient ID.

## Claim & login

| ID | Priority | Steps | Expected |
|----|----------|-------|----------|
| PP-01 | P0 | `/claim` with catalog contact email | Org matched; **6-digit code emailed** (never shown in UI/network) |
| PP-02 | P0 | Complete claim (code + password meeting complexity) | Signed in; owner membership; org profile **verified** |
| PP-03 | P0 | `/login` as claimed owner | Dashboard loads for that org |
| PP-04 | P1 | `/login` with Auth user but no membership | Blocked / no portal session |
| PP-05 | P0 | `/login?next=https://evil.example` | Lands on `/app/dashboard` (redirect allowlist) |
| PP-06 | P0 | `/forgot-password` unknown email | Generic success; no email sent |
| PP-07 | P0 | `/forgot-password` known member | Code emailed → verify → set complex password → login |
| PP-08 | P1 | Rapid re-request of claim/reset OTP | Throttled (~1/min; daily/IP caps) |

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

## Documents / messages / appointments (smoke)

| ID | Priority | Steps | Expected |
|----|----------|-------|----------|
| PP-30 | P1 | Upload document for connected patient | Stored; visible on patient detail in portal |
| PP-30b | P0 | Patient: Me → Documents after upload | Document listed; tap opens file |
| PP-31 | P0 | Messages → send to all connected | Threads created; patient inbox shows; push when device registered |
| PP-31b | P0 | Patient replies in mobile thread | Message appears; portal thread reply works |
| PP-31c | P1 | Patient detail → Mark as staff | Membership created; Staff badge on patients list |
| PP-31d | P1 | Mobile: New message → search staff/patient by name or Patient ID | DM opens when chat matrix allows |
| PP-32 | P2 | Appointment request list | Status updates persist |

## Related

- [Connections](./connections.md)
- [Messaging](./messaging.md)
- [Development](./development.md)
- Mobile Nearby / Me notes: [`../../caremate-mobile/docs/provider-model.md`](../../caremate-mobile/docs/provider-model.md)
