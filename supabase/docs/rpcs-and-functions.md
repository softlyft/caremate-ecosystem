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
| `create-checkout` | Start hosted checkout for Premium | required |
| `billing-webhook-stripe` | Stripe subscription lifecycle updates | disabled |
| `billing-webhook-paystack` | Paystack payment lifecycle updates | disabled |

Shared helpers:

- `_shared/cors.ts`
- `_shared/supabase.ts`

## `create-checkout`

Implemented responsibilities:

- Validate authenticated user
- Resolve requested plan/interval/currency
- Look up active `subscription_prices`
- Create an initial `subscriptions` row
- Start Paystack or Stripe hosted checkout
- Return checkout URL and subscription metadata

Family plans can derive or require a household ID.

## Webhook Functions

Webhook functions are configured without JWT enforcement so external payment providers can reach them.

These functions are part of the billing lifecycle rather than user-facing app routing.
