# Auth and RBAC

## Staff Roles

The portal recognizes three staff roles from Supabase user metadata:

- `admin`
- `editor`
- `support`

Role helpers live in `src/constants/roles.ts`.

| Helper | Meaning |
|--------|---------|
| `isStaffRole()` | Valid staff role |
| `canManageUsers()` | `admin` or `support` |
| `canEditCatalog()` | `admin` or `editor` |
| `canAssignRoles()` | `admin` only |
| `canManageBilling()` | `admin` only |
| `canViewAuditLogs()` | Any staff role |

## Session Model

`src/lib/auth.ts` exposes:

- `getPortalSession()`
- `requirePortalSession()`

These helpers:

1. Load the current Supabase user
2. Read `user.app_metadata.role`
3. Reject access when the user is missing or not a staff role

## Route Protection

`src/middleware.ts` delegates to `src/lib/supabase/middleware.ts`.

Implemented behavior:

- `/dashboard/*` requires an authenticated staff user
- `/login` redirects to `/dashboard` when a staff user is already signed in
- Non-staff or unauthenticated users hitting protected routes are redirected to `/login`

## Where RBAC Is Enforced

### 1. Middleware

Prevents non-staff access to dashboard routes.

### 2. Server helpers and page guards

Server actions call:

- `requirePortalSession()`
- role helper functions such as `canEditCatalog()` or `canManageBilling()`

### 3. Database RLS

Supabase migrations add:

- `is_staff()`
- `is_admin()`
- `can_edit_catalog()`

These backstop portal behavior for catalog and billing tables.

## User Administration

User admin flows are implemented through the `users` domain and use the service-role client for Auth Admin operations.

Implemented capabilities:

- List users
- View user detail
- Disable / enable users
- Send reset code (6-digit email OTP; user enters it in CareMate → Forgot password → Already have a code?)
- Assign staff role

Support can manage users, but only admins can assign roles.

## Audit Logging

`src/lib/audit.ts` writes to `admin_audit_events` using the service-role client.

It captures:

- Actor user ID and email
- Action string (`create_*` / `update_*` / `delete_*` and related verbs)
- Entity type and entity ID
- Optional JSON payload

Implemented behavior:

- Audit writes are triggered from mutating server actions (create, update, delete, and privileged side-effects)
- Insert failures **fail closed** (the mutation throws if the audit row cannot be written)
- Staff can browse events at `/dashboard/audit` (filters: operation, action, entity, actor email)
- Action/entity string catalog: `src/lib/audit-catalog.ts`

## Current Constraints

- Portal trust depends on Supabase auth metadata roles
- Service-role usage is intentionally limited to server code, but it remains highly privileged
- There is no MFA-specific portal flow implemented here
