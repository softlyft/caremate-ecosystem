# RPCs and Functions

## RPCs

The shared schema currently exposes several important RPCs.

### Family RPCs

Defined by the family migrations:

- `lookup_user_for_family_connect`
- `create_family_connection_request` (owner-only; max 3 invited adults + pending)
- `respond_family_connection_request`
- `cancel_family_connection_request` (owner-only)
- `remove_family_adult_member` (owner-only)
- `family_adult_invite_seats_used`
- `is_household_member`

These support family-member discovery, household invites, and owner-managed seats.

### Provider RPCs

- `ensure_provider_catalog_stub`
- `nearby_providers`
- `search_providers_by_name`
- `prune_user_location_samples`
- `is_provider_org_verified`
- `request_patient_provider_connection`
- `request_provider_connection_by_caremate_id`
- `send_provider_org_message` / `post_patient_message` / `post_org_message`
- `mark_connected_patient_as_staff`
- `search_messageable_users` / `start_direct_conversation`
- `is_org_practitioner` / `is_linked_to_org` / `can_direct_message`
- `is_message_conversation_participant` / `can_read_message_conversation`

`nearby_providers` powers the mobile Nearby list by returning a geospatially filtered CareMate provider projection page (default radius 25 km).

`search_providers_by_name` powers the Nearby search box and global provider search with live name/address matching and **no coordinates**.

`prune_user_location_samples` keeps each signed-in user’s exact GPS history at the newest 20 rows.

Connection RPCs power patient ↔ org engagement (portal + mobile). Details: [Provider Portal connections](../../caremate-provider-portal/docs/connections.md) · [messaging](../../caremate-provider-portal/docs/messaging.md) · [data model](../../caremate-provider-portal/docs/data-model.md).

Also portal RLS helpers (security definer): `is_provider_org_member`, `provider_org_role`, `can_write_provider_org`, `can_manage_provider_org`.

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
| `notify-family-email` | Mobile after family connection request / accept / decline | required |
| `notify-message` | Org message or direct DM push to recipient devices | required |

Shared helpers:

- `_shared/cors.ts`
- `_shared/supabase.ts`
- `_shared/push.ts` — Expo push via `notification_devices`
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
