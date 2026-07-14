# Shared Supabase schema

Single source of truth for the CareMate cloud database (Postgres, RLS, RPCs, Storage).

All apps in this monorepo (`caremate`, `caremate-portal`, future packages) target the same project.

## Commands (from repo root)

```bash
npm run supabase:link
npm run supabase:migration:new -- describe_change
npm run supabase:migration:list
npm run supabase:db:push
npm run db:types
```

## Rules

1. **Only** add SQL migrations here — never under an app folder.
2. Tables synced by the mobile app require a matching update to `caremate/src/database/schema.ts` + sync handlers + `caremate/docs/supabase-alignment.md`.
3. Admin-/portal-only tables do not need a SQLite mirror.
4. After schema changes, regenerate `packages/db-types` with `npm run db:types`.
