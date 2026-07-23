# Supabase Docs

This docs set covers the shared cloud backend used by CareMate services.

## Quick Links

| Topic | Read |
|------|------|
| Schema groups and data ownership | [Schema Overview](./schema-overview.md) |
| Auth, roles, and RLS model | [Auth and RLS](./auth-and-rls.md) |
| RPCs and Edge Functions | [RPCs and Functions](./rpcs-and-functions.md) |
| Migrations, seeds, local CLI workflow | [Operations](./operations.md) |
| Cross-service security (Edge, handoff, webhooks) | [`docs/security.md`](../../docs/security.md) |
| Provider Portal | [docs/README.md](../../caremate-provider-portal/docs/README.md) · connections, claim, schema, QA | Migrations `20260719140000_*` … `20260719200000_*` |

## What This Service Owns

- Shared Postgres schema
- Row Level Security policies
- JWT role helpers
- RPC functions
- Storage buckets/policies
- Edge Functions for billing

## Main Source Areas

| Area | Path |
|------|------|
| SQL migrations | `supabase/migrations/` |
| Local CLI config | `supabase/config.toml` |
| Seed placeholder | `supabase/seed.sql` |
| Edge Functions | `supabase/functions/` |
