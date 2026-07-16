# CareMate Portal Docs

This docs set covers the implemented behavior of the CareMate admin portal.

## Quick Links

| Topic | Read |
|------|------|
| Service overview and structure | [Architecture](./architecture.md) |
| Staff auth, roles, middleware, audit | [Auth & RBAC](./auth-rbac.md) |
| Articles, tips, providers, media workflows | [Catalogs](./catalogs.md) |
| Premium price management and subscribers | [Billing](./billing.md) |
| Local setup, env vars, scripts, tests | [Development](./development.md) |
| Manual verification and smoke coverage | [QA Testing](./qa-testing.md) |

## What the Portal Does

The portal is the staff-facing web surface for:

- User administration
- Learn article management
- Health tip management
- Provider upload/archive workflows
- Premium price management
- Subscriber visibility
- Admin audit event writes

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
