# Billing

## Purpose

The portal is the staff/admin surface for managing Premium pricing, viewing payment transactions, and viewing subscribers.

Routes:

- `/dashboard/billing` — price catalog
- `/dashboard/billing/transactions` — payment ledger (`payments`)
- `/dashboard/billing/subscribers` — entitlements (`subscriptions`)

## Managed Data

Shared Supabase tables:

| Table | Meaning |
|-------|---------|
| `subscription_prices` | Configurable plan catalog |
| `payments` | Transaction ledger (Paystack / Stripe charges) |
| `subscriptions` | Entitlement after a **successful** payment |

Checkout creates a **pending payment** only. An active **subscription** row is inserted (or renewed) when the charge succeeds via webhook or `verify-checkout`.

## Portal Responsibilities

Implemented portal billing responsibilities:

- Show configured price rows
- Update price amount and active state
- Persist Stripe or Paystack identifiers where needed
- Let admins view **Transactions** (charges) and **Subscribers** (entitlements) separately

## Permissions

Only `admin` users can manage billing (transactions + subscribers). Staff may view the price catalog depending on role helpers.

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

## Transactions vs Subscribers

| Page | Source | Shows |
|------|--------|--------|
| **Transactions** | `payments` | Amount, provider reference, pending/succeeded/failed |
| **Subscribers** | `subscriptions` | Plan, period start/end, entitlement status |

Pending / failed checkouts appear only under Transactions. Subscribers lists entitlements after money was collected **or** after an admin grant.

### Admin-activated subscriptions

On **Subscribers**, admins can **Add a subscriber**:

1. Enter the member’s 12-digit Patient ID
2. Select a plan from the active price catalog
3. Create an `active` subscription with `provider = admin`, `provider_ref = admin_activated`, and **no** `payments` row

Family plans still require an existing household for that user. The mobile app hydrates Premium from `subscriptions` the same way as paid plans (including offline until `current_period_end`).

### Admin Standard → Family upgrade

**Upgrade to Family** on Subscribers:

1. Enter Patient ID for a member with active Standard
2. Select a Family catalog price (interval / currency)
3. Cancels Standard and grants a new Family period from today (`provider = admin`, `provider_ref = admin_upgraded_to_family`)

Paid self-serve upgrades (credit against unused Standard) use Edge Functions `quote-upgrade` / `create-upgrade` from the mobile Premium screen — see [Premium & plans](../../caremate/docs/premium-and-plans.md).

## Cross-Service Relationship

Billing spans multiple services:

- Mobile opens hosted `payment/` → Edge Function `create-checkout` (pending payment)
- Currency from member country: Nigeria → NGN/Paystack; otherwise USD/Stripe (`currency-by-country.ts`)
- Standard → Family: `quote-upgrade` / `create-upgrade` (credit + new Family period from today)
- Paystack / Stripe charge → webhook **or** `verify-checkout` → payment succeeded + subscription active
- Portal manages pricing, transactions, subscriber grants, and admin upgrades

**Product rules** (what Free vs Standard vs Family Premium unlocks on mobile): [`caremate/docs/premium-and-plans.md`](../../caremate/docs/premium-and-plans.md).

## Important Boundaries

- Payment processor secrets are **not** stored in the portal `.env`
- Stripe and Paystack secrets belong to Supabase Edge Functions
- The portal does not execute checkout itself

## Current Constraints

- There is no customer self-service billing portal in the mobile app or portal here
- Paid checkout lifecycle is driven by Edge Functions/webhooks; the portal also writes entitlements for **admin grants** and **admin Standard → Family upgrades**
