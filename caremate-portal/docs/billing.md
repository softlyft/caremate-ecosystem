# Billing

## Purpose

The portal is the staff/admin surface for managing Premium pricing and viewing subscribers.

Routes:

- `/dashboard/billing`
- `/dashboard/billing/subscribers`

## Managed Data

The billing area operates on shared Supabase tables:

- `subscription_prices`
- `subscriptions`

These tables are defined by the shared Supabase migrations, not by the portal itself.

## Portal Responsibilities

Implemented portal billing responsibilities:

- Show configured price rows
- Update price amount and active state
- Persist Stripe or Paystack identifiers where needed
- Let admins view subscriber information

## Permissions

Only `admin` users can manage billing.

RBAC enforcement happens through:

- `canManageBilling()` in `src/constants/roles.ts`
- Server-side checks in `src/domains/billing/actions.ts`
- Shared Supabase RLS and helper functions

## Price Update Flow

`updateSubscriptionPrice()`:

1. Requires an admin portal session
2. Validates `amount_minor`
3. Updates the `subscription_prices` row
4. Writes an `admin_audit_events` record
5. Revalidates the billing page

## Subscriber View

The subscriber page is an admin-only reporting surface.

What it shows depends on the shared `subscriptions` data plus any admin-side enrichment needed from auth/profile context.

## Cross-Service Relationship

Billing spans multiple services:

- Mobile starts checkout via Supabase Edge Function `create-checkout`
- Supabase stores prices/subscriptions and handles webhooks
- Portal manages pricing and subscriber visibility

## Important Boundaries

- Payment processor secrets are **not** stored in the portal `.env`
- Stripe and Paystack secrets belong to Supabase Edge Functions
- The portal does not execute checkout itself

## Current Constraints

- There is no customer self-service billing portal in the mobile app or portal here
- Subscription lifecycle writes are driven by Edge Functions/webhooks rather than portal actions
