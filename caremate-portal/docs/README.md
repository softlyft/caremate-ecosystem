# CareMate Portal Docs

This docs set covers the implemented behavior of the CareMate admin portal.

## Quick Links

| Topic | Read |
|------|------|
| Service overview and structure | [Architecture](./architecture.md) |
| Staff auth, roles, middleware, audit | [Auth & RBAC](./auth-rbac.md) |
| Articles, tips, providers, media workflows | [Catalogs](./catalogs.md) |
| Premium pricing, transactions, subscribers, admin grants | [Billing](./billing.md) |
| Ads kill switches + campaigns | Mobile strategy: [`caremate/docs/ads.md`](../../caremate/docs/ads.md) · `/dashboard/ads` · slot constants in `src/domains/ads/constants.ts` |
| Premium product matrix (mobile) | [`caremate/docs/premium-and-plans.md`](../../caremate/docs/premium-and-plans.md) |
| Local setup, env vars, scripts, tests | [Development](./development.md) |
| Manual verification and smoke coverage | [QA Testing](./qa-testing.md) |

## What the Portal Does

The portal is the **SoftLyft staff-facing** web surface for:

- User administration
- Learn article management
- Health tip management
- Provider catalog upload/archive and FHIR view workflows
- Premium price management
- Subscriber visibility
- Admin audit event writes and browse UI (`/dashboard/audit`)
- Ads: per-slot source modes (`off` \| `house` \| `sponsored` \| `admob` for every slot, including mini-apps), advertiser verification, house + sponsored campaign CRUD (`/dashboard/ads`). Slot ids must stay aligned with mobile `AD_SLOTS`. Do not export non-async constants from `"use server"` action modules — use `src/domains/ads/constants.ts`.

Provider organizations that engage patients use the separate **[Provider Portal](../../caremate-provider-portal/docs/README.md)** (`caremate-provider-portal/`) — not this admin console. Start with [connections](../../caremate-provider-portal/docs/connections.md) and [auth/claim](../../caremate-provider-portal/docs/auth-claim.md).

## Source Areas

| Area | Path |
|------|------|
| Routes | `src/app/` |
| Domain actions and repositories | `src/domains/` |
| Supabase/auth helpers | `src/lib/` |
| Bootstrapping and seeds | `scripts/` |

## Entry Points

- Service README: `caremate-portal/README.md`
- Monorepo overview: `../README.md`
