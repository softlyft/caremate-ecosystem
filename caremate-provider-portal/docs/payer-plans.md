# Payer plans (Support Team)

Care Portal payer org billing is **separate** from provider Private Care Team and patient Premium.

## Product rules

| Surface | Gate |
|---------|------|
| Org ↔ patient Messages | Always free (write roles) |
| Patient ↔ Support Team DMs | Owner/admin **or** `payer_org_members.support_team = true` + approved connection |
| Mark as staff | Membership only — does **not** grant patient DMs |
| Add to Support Team | Manage role; seat limit from org entitlement |
| Voice | Support Team + plan allowance (no video for payers) |
| Care team group chat | Requires payer `group_chat_enabled` (Pro+). Enforced in `start_care_coordination_conversation` / candidate listing. |
| Plan changes | Upgrade-only (or same-tier renewal). Downgrades blocked at checkout. |

Owners/administrators can always DM connected patients **without** consuming a Support Team seat.

### Plan defaults

Live defaults (catalog / free entitlement RPC):

| Tier | Support Team seats | Patients | Provider partners | Voice | Group chat |
|------|-------------------|----------|-------------------|-------|------------|
| Free (no active sub) | 2 | 7 | 3 | 0 | No |
| Basic | 7 | 100 | 25 | catalog minutes / mo | No |
| Pro | 25 | 250 | 75 | catalog minutes / mo | Yes |
| Enterprise | SoftLyft grant | SoftLyft grant | SoftLyft grant | Custom | Yes |

Paid checkout: **Paystack NGN only** (monthly / yearly).

## Schema

- `payer_org_plan_prices` — SoftLyft-editable catalog
- `payer_org_subscriptions` — active entitlement (`admin` \| `paystack`)
- `payer_org_payments` — org ledger
- `payer_org_usage_counters` — voice minutes
- `payer_org_members.support_team`

Helpers: `payer_org_entitlements`, `payer_org_has_group_chat`, `is_support_team_member`, `set_support_team_member`, `admin_grant_payer_org_subscription`, `mark_connected_patient_as_payer_staff`.

## Surfaces

| App | Path |
|-----|------|
| SoftLyft admin | `/dashboard/payer-plans` (catalog) · `/dashboard/payer-plans/grants` |
| Care Portal (payer) | Patient detail → Support Team · `/payer/settings/billing` |
| Website | `/payers/pricing` |
| Edge | `create-payer-org-checkout` · Paystack webhook branches on `pyo_` / `product=payer_org_support_team` |

## Related

- [Provider plans](./provider-plans.md)
- [Messaging](./messaging.md)
