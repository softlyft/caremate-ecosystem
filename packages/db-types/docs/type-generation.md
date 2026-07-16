# Type Generation

## Source of Truth

The package reflects the shared schema defined in `../../supabase/migrations/`.

## Regeneration Workflow

Run from the monorepo root:

```bash
npm run db:types
```

This runs `scripts/merge-db-types.mjs`.

## What the Script Does

`scripts/merge-db-types.mjs`:

1. Runs `supabase gen types typescript --linked`
2. Writes an intermediate `packages/db-types/src/database.gen.ts`
3. Appends CareMate-specific aliases and generic helpers
4. Writes the final `packages/db-types/src/database.ts`
5. Removes the temporary generated file

## Requirements

- Supabase CLI installed
- local repo linked to the target Supabase project

## When to Regenerate

Regenerate whenever:

- a migration changes schema
- a new RPC is added
- table columns change
- shared consumers need updated contract coverage
