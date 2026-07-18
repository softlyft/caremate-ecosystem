# RPCs and Functions

## RPCs

The shared schema currently exposes several important RPCs.

### Family RPCs

Defined by the family migrations:

- `lookup_user_for_family_connect`
- `create_family_connection_request`
- `respond_family_connection_request`
- `is_household_member`

These support spouse/user discovery and household connection flows.

### Provider RPCs

- `ensure_provider_catalog_stub`
- `nearby_providers`

`nearby_providers` powers the mobile Nearby experience by returning a geospatially filtered provider projection page.

### Role helper functions

These are also callable SQL functions and support policy logic:

- `jwt_role`
- `is_staff`
- `is_admin`
- `can_edit_catalog`

## Edge Functions

Edge Functions live under `supabase/functions/`.

| Function | Purpose | JWT |
|----------|---------|-----|
| `create-checkout` | Create pending `payments` row + hosted Paystack/Stripe checkout | required |
| `quote-upgrade` | Quote Standard → Family credit and amount due | required |
| `create-upgrade` | Pending upgrade payment (or zero-charge activate) | required |
| `verify-checkout` | Confirm charge with provider and activate subscription (app return) | required |
| `billing-webhook-stripe` | Stripe payment + subscription lifecycle updates | disabled |
| `billing-webhook-paystack` | Paystack charge success / failure | disabled |

Shared helpers:

- `_shared/cors.ts`
- `_shared/supabase.ts`
- `_shared/billing.ts` — finalize payment → create/renew subscription (or upgrade finalize)
- `_shared/upgrade.ts` — Standard → Family quote math + finalize swap

## `create-checkout`

Implemented responsibilities:

- Validate authenticated user
- Resolve requested plan/interval/currency
- Look up active `subscription_prices`
- Insert a **pending** `payments` row (no subscription yet)
- Block Family checkout when the user already has active Standard (must use `create-upgrade`)
- Start Paystack or Stripe hosted checkout
- Return checkout URL + `payment_id` / `reference`

Family plans can derive or require a household ID.

## `quote-upgrade` / `create-upgrade`

- Quote unused Standard credit against full Family list price; new Family period starts today
- `create-upgrade` charges the difference (or activates at zero) and cancels Standard on success

## `verify-checkout` / webhooks

On successful charge:

1. Mark `payments` as `succeeded`
2. Create or renew an **active** `subscriptions` entitlement (or finalize Family upgrade when `metadata.intent === 'upgrade'`)
3. Link `payments.subscription_id` ↔ `subscriptions.payment_id`

Webhook functions are configured without JWT enforcement so external payment providers can reach them.
