# Auth & claim

There is **no open registration**. Staff reach the portal by claiming a catalog organization, or SoftLyft seeds membership with the bootstrap script.

## Claim flow (`/claim`)

1. Enter the contact email already on the CareMate catalog (location email, else organization FHIR contact).
2. Match an **unclaimed** `provider_organizations` row.
3. Generate a verification code (shown in the UI only in non-production / `ALLOW_INLINE_OTP`; production must send OOB email — see [`docs/security.md`](../../docs/security.md)).
4. After verify, set password → creates:
   - Supabase Auth user
   - `provider_org_members` row with role **`owner`**
   - `provider_profiles` stub with **`verification_status = verified`**

Claimed organizations are treated as verified so patients can connect from the mobile app. Existing orgs that already have an owner membership are backfilled to `verified` by migration `20260719170000_connection_rejection_and_verified.sql`.

## Login (`/login`)

Returning staff sign in with email/password. Session is valid only if the user has at least one active (`deleted_at is null`) `provider_org_members` row.

Active organization: cookie `provider_active_org`, or the first membership.

## Roles (RBAC)

| Role | Typical access |
|------|----------------|
| `owner` | Full org + membership management |
| `administrator` | Manage profile, patients, content |
| `staff` | Day-to-day connections, docs, broadcasts, appointments |
| `viewer` | Read-only |

Enforced with Supabase RLS helpers:

- `is_provider_org_member(org_id)`
- `can_write_provider_org(org_id)` — owner, administrator, staff
- `can_manage_provider_org(org_id)` — owner, administrator

Write actions (approve / reject / request connection, uploads, broadcasts) require write role via `requireWriteAccess()`.

## Ops bootstrap

Emergency / SoftLyft seeding only:

```bash
npm run bootstrap:member -w caremate-provider-portal -- user@example.com <organization-uuid> owner --create --password 'secret'
```

Creates membership (and optionally Auth user + verified `provider_profiles` stub). Prefer `/claim` for normal onboarding.

## Related

- Claim implementation: `src/domains/claim/`
- Auth helpers: `src/lib/auth.ts`
- [Connections](./connections.md) (verification gate for patients)
- [Development](./development.md)
