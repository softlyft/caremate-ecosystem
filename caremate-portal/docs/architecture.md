# Portal Architecture

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase SSR + Supabase JS
- Shared types from `@caremate/db-types`

## Route Structure

Routes live under `src/app/`.

| Route | Purpose |
|------|---------|
| `/` | Redirect into login or dashboard |
| `/login` | Staff login |
| `/dashboard` | Overview metrics |
| `/dashboard/users` | User list |
| `/dashboard/users/[id]` | User detail and admin actions |
| `/dashboard/learn` | Articles list |
| `/dashboard/learn/new` | Create article |
| `/dashboard/learn/[id]` | Edit article |
| `/dashboard/tips` | Health tips management |
| `/dashboard/providers` | Providers directory views |
| `/dashboard/providers/upload` | Provider ingest upload UI |
| `/dashboard/providers/new` | Redirect to upload |
| `/dashboard/providers/[id]` | Provider detail / archive |
| `/dashboard/billing` | Subscription price management |
| `/dashboard/billing/transactions` | Payment ledger |
| `/dashboard/billing/subscribers` | Subscriber list + admin grant / Family upgrade |
| `/dashboard/audit` | Staff create / update / delete audit trail |

## Layering

The portal is organized around:

```text
Route/Page
  → Feature UI
  → Domain action or repository
  → Supabase client helper
```

### Domain split

| Domain | Purpose |
|-------|---------|
| `articles` | Article CRUD and article listing |
| `audit` | List/filter `admin_audit_events` for `/dashboard/audit` |
| `billing` | Prices, transactions, subscribers, admin grants / Family upgrade |
| `dashboard` | Summary counts and dashboard metrics |
| `media` | Learn media upload |
| `providers` | Provider listing, ingest upload, archive |
| `tips` | Health tip CRUD |
| `users` | User listing and Auth Admin actions |

## Supabase Client Model

There are two main access patterns:

### Session client

Used where actions should respect normal staff RLS:

- `src/lib/supabase/server.ts`
- `src/lib/supabase/browser.ts`

This is used for most catalog editing and reads.

### Service-role client

Used for privileged operations:

- `src/lib/supabase/admin.ts`

Use cases:

- Auth Admin operations
- Cross-user joins and list queries
- Audit inserts
- Some dashboard enrichments

This client is server-only and must never be imported into client components.

## Layout and Shell

- `src/app/layout.tsx` provides fonts and global providers
- `src/app/dashboard/layout.tsx` protects dashboard routes and wraps them with the dashboard shell
- `src/components/dashboard-shell.tsx` provides left-nav layout and dashboard navigation

## Data Ownership

The portal does not own schema migrations. Those live in `../supabase/migrations/`.

It is responsible for operating on shared cloud data such as:

- `articles`
- `health_tips`
- `providers`
- `subscription_prices`
- `subscriptions` (read/admin visibility)
- `admin_audit_events`

## Current Architectural Constraints

- TanStack Query is installed but not a major data-fetching mechanism yet
- Audit events are written; staff browse them at `/dashboard/audit`
- Provider upload depends on the external `provider-ingestion` service
