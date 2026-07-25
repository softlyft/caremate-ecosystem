# CareMate Community Portal Docs

Contributor portal for the CareMate Community Network (CCN). Same Supabase Auth project as the
CareMate mobile app. Enrollment is limited to existing patients with a CareMate Patient ID.

## Quick links

| Topic | Read |
|-------|------|
| Package layout, routes, session | [Architecture](./architecture.md) |
| Patient ID verification + login | [Auth](./auth.md) |
| Tables and migrations | [Data model](./data-model.md) |
| Local setup, env, scripts | [Development](./development.md) |
| AWS Amplify hosting (monorepo) | [`../../docs/amplify-hosting.md`](../../docs/amplify-hosting.md) |
| Security (join OTP, headers) | [`../../docs/security.md`](../../docs/security.md) |
| Manual verification checklist | [QA testing](./qa-testing.md) |

## In scope (Phase 1)

- Patient ID → email code verification (OTP never returned to the browser; OOB email required)
- Join admin-created active chapters immediately (no profile duplication)
- Chapter hub, events, announcements, resources, gallery
- Contribution points + chapter / national leaderboards
- Badges and certificates (admin-awarded)
- In-app notifications
- SoftLyft admin oversight under `caremate-admin-portal` `/dashboard/community/*`

## Out of scope

Chat, forums, messaging, mentorship product, elections, grants, marketplace, AI features.

## Related docs

| Surface | Docs |
|---------|------|
| Monorepo overview | [`../../README.md`](../../README.md) |
| Package entry README | [`../README.md`](../README.md) |
| Public CCN marketing + guide | [`../../caremate-website/README.md`](../../caremate-website/README.md) · `/ccn`, `/ccn/guide` |
| SoftLyft admin portal | [`../../caremate-admin-portal/docs/README.md`](../../caremate-admin-portal/docs/README.md) |
| Shared Supabase | [`../../supabase/docs/README.md`](../../supabase/docs/README.md) |

## Source areas

| Area | Path |
|------|------|
| Routes | `src/app/` |
| Domains (repos + server actions) | `src/domains/` |
| Join / login UI | `src/features/` |
| Auth / Supabase clients | `src/lib/` |
| Ops bootstrap | `scripts/` |
