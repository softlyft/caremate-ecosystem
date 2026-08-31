# Auth & claim

There is **no open registration**. Staff reach Care Portal by claiming a catalog organization (provider or payer), or SoftLyft seeds membership with the bootstrap script.

## Claim flow (`/claim`)

1. Choose **Care Org type**: Provider or Payer.
2. Enter the contact email already on the CareMate catalog.
3. Match an **unclaimed** row:
   - Provider → `provider_organizations` (location email, else organization FHIR contact)
   - Payer → `payer_organizations.email` with zero active `payer_org_members`
4. Generate a verification code and email it via SES (`send-provider-claim-otp`). Kind `claim` vs `payer_claim` for rate-limit buckets. The code is never returned to the browser.
   - Care Portal must call the function with `SUPABASE_SERVICE_ROLE_KEY` (trimmed; same project as `NEXT_PUBLIC_SUPABASE_URL`). A mismatch surfaces as **Unauthorized** on claim.
5. After verify, set password → creates:
   - Supabase Auth user (`care_portal: true`, `care_org_kind`)
   - Owner membership (`provider_org_members` or `payer_org_members`)
   - Profile stub with **`verification_status = verified`**
6. Redirect: provider → `/app/dashboard`; payer → `/payer/dashboard`.

Claimed provider organizations are treated as verified so patients can connect from the mobile app. Existing orgs that already have an owner membership are backfilled to `verified` by migration `20260719170000_connection_rejection_and_verified.sql`.

## Login (`/login`)

Returning staff sign in with email/password. Session is valid if the user has at least one active membership in **either** `provider_org_members` or `payer_org_members`.

| Membership | Home |
|------------|------|
| Provider only | `/app/dashboard` |
| Payer only | `/payer/dashboard` |
| Both (rare) | Cookie `care_active_kind` if set to `payer`, else provider |

After sign-in, a server action reads `care_active_kind` (httpOnly) and membership tables, then sets the cookie to match the resolved destination.

Active org cookies: `provider_active_org`, `payer_active_org`.

Middleware protects `/app/*` with provider membership and `/payer/*` with payer membership.

## Forgot password (`/forgot-password`)

1. Enter the portal account email.
2. Requests are rate-limited (`provider_auth_otp_sends`).
3. If the user exists **and** has an active provider or payer membership, email a 6-digit OTP via SES (`send-provider-password-reset-otp`). The code is never returned to the browser.
4. Request always returns a generic success message (anti-enumeration), including when SES fails for a known account.
5. After verify, set a new password (8+ with upper, lower, digit, symbol) → updates the Auth user and marks the challenge consumed.

Table: `provider_password_resets` (service role only).

## Roles (RBAC)

| Role | Typical access |
|------|----------------|
| `owner` | Full org + membership management |
| `administrator` | Manage profile, patients, content |
| `staff` | Day-to-day connections, docs, messages, appointments |
| `viewer` | Read-only |

Provider RLS helpers: `is_provider_org_member`, `can_write_provider_org`, `can_manage_provider_org`.

Payer RLS helpers: `is_payer_org_member`, `can_write_payer_org`, `can_manage_payer_org`.

Write actions (approve / reject / request connection, uploads, messages) require write role via `requireWriteAccess()`. Marking a connected patient as staff requires manage role (`requireManageAccess()`).

## Ops bootstrap

Emergency / SoftLyft seeding for **providers** only:

```bash
npm run bootstrap:member -w caremate-provider-portal -- user@example.com <organization-uuid> owner --create --password 'secret'
```

Creates membership (and optionally Auth user + verified `provider_profiles` stub). Prefer `/claim` for normal onboarding.

### Seed a payer org to claim locally

```sql
insert into public.payer_organizations (name, email, active)
values ('Demo Payer HMO', 'payer-claim@example.com', true);
```

Then open `/claim`, choose **Payer**, and use that email.

## Related

- Claim implementation: `src/domains/claim/`
- Password reset: `src/domains/password-reset/`
- Auth helpers: `src/lib/auth.ts`
- [Connections](./connections.md) (verification gate for patients)
- [Development](./development.md)
