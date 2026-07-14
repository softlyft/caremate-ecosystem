# Shared Postgres types for CareMate clients

Hand-maintained for now to match [`../../supabase/migrations`](../../supabase/migrations).

Regenerate (when CLI is linked):

```bash
# from monorepo root
npm run db:types
```

Mobile SQLite (Drizzle) stays in `caremate/src/database/schema.ts` and must stay aligned for synced tables — see `caremate/docs/supabase-alignment.md`.
