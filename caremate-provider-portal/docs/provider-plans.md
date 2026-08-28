# Provider plans (Private Care Team)

Care Portal org billing is **separate** from patient Premium (`subscription_prices` / `payments` / `subscriptions`).

## Product rules

| Surface | Gate |
|---------|------|
| Org ↔ patient Messages | Always free (write roles) |
| Patient ↔ practitioner DMs | Peer must be `provider_org_members.private_care_team = true` |
| Mark as staff | Membership only — does **not** grant patient DMs |
| Add to Private Care Team | Manage role; seat limit from org entitlement |

### Plan defaults

| Tier | PCT seats | Patients | Voice / video (reserved) |
|------|-----------|----------|---------------------------|
| Free (no active sub) | 1 | 5 | 0 |
| Basic | 5 | 20 | 100h each / mo |
| Pro | 20 | 100 | 250h each / mo |
| Enterprise | SoftLyft grant | SoftLyft grant | Custom |

Paid checkout: **Paystack NGN only** (monthly / yearly).

## Schema

- `provider_org_plan_prices` — SoftLyft-editable catalog
- `provider_org_subscriptions` — active entitlement (`admin` \| `paystack`)
- `provider_org_payments` — org ledger
- `provider_org_usage_counters` — future voice/video
- `provider_org_members.private_care_team`

Helpers: `provider_org_entitlements`, `is_private_care_team_member`, `set_private_care_team_member`, `admin_grant_provider_org_subscription`.  
`can_direct_message` requires PCT for patient DMs; staff↔staff unchanged.

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
