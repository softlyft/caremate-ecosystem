# Provider plans (Private Care Team)

Care Portal org billing is **separate** from patient Premium (`subscription_prices` / `payments` / `subscriptions`).

## Product rules

| Surface | Gate |
|---------|------|
| Org ↔ patient Messages | Always free (write roles) |
| Patient ↔ practitioner DMs | Owner/admin **or** (`private_care_team` + `profiles.is_health_practitioner`) + messaging consent |
| Staff ↔ staff DMs | Active org membership (no PCT seat required) |
| Mark as staff | Membership only — does **not** grant patient DMs |
| Add to Private Care Team | Manage role; seat limit from org entitlement |
| Plan changes | Upgrade-only (or same-tier renewal). Downgrades blocked at checkout. |

Owners/administrators can always DM connected patients **without** consuming a PCT seat.

### Plan defaults

Live defaults (catalog / free entitlement RPC):

| Tier | PCT seats | Patients | Payer partners | Voice / video (reserved) |
|------|-----------|----------|----------------|---------------------------|
| Free (no active sub) | 2 | 20 | 3 | 0 |
| Basic | 7 | 50 | 25 | catalog minutes / mo |
| Pro | 25 | 200 | 75 | catalog minutes / mo |
| Enterprise | SoftLyft grant | SoftLyft grant | SoftLyft grant | Custom |

Paid checkout: **Paystack NGN only** (monthly / yearly), hosted by the **payment gateway**.

Care Portal billing actions build a payment-gateway URL (`product=provider_org`, plan tier, org id, handoff) and redirect. The gateway reads `provider_org_plan_prices`, calls `create-provider-org-checkout`, and returns through gateway `/success` → `verify-checkout` (webhook remains durable). Do **not** call the Edge Function directly from Care Portal.

Checkout return URLs nested under the gateway are Care Portal billing (`/app/settings/billing?paid=1`) and website cancel (`/providers/pricing`). Edge `assertAllowedReturnUrls` allowlists CareMate https hosts.

## Schema

- `provider_org_plan_prices` — SoftLyft-editable catalog
- `provider_org_subscriptions` — active entitlement (`admin` \| `paystack`)
- `provider_org_payments` — org ledger
- `provider_org_usage_counters` — future voice/video
- `provider_org_members.private_care_team`

Helpers: `provider_org_entitlements`, `is_private_care_team_member`, `set_private_care_team_member`, `admin_grant_provider_org_subscription`.  
`can_direct_message` allows owner/admin or PCT health practitioners for patient DMs; staff↔staff unchanged.

## Surfaces

| App | Path |
|-----|------|
| SoftLyft admin | `/dashboard/provider-plans` (catalog) · `/dashboard/provider-plans/grants` |
| Care Portal | Patient detail → Private Care Team · `/app/settings/billing` |
| Website | `/providers/pricing` (not consumer `/pricing`) |
| Edge | `create-provider-org-checkout` · Paystack webhook branches on `pog_` / `product=provider_org_private_care_team` |

## Related

- [Messaging](./messaging.md)
- [Connections](./connections.md)
- Patient Premium stays in mobile [`premium-and-plans.md`](../../caremate-mobile/docs/premium-and-plans.md)
