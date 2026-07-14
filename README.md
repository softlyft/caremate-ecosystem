# CareMate Ecosystem (monorepo)

Single GitHub repo for CareMate apps that share one Supabase project.

```
caremate-ecosystem/
  supabase/              # Postgres migrations, RLS, RPCs, Storage (source of truth)
  packages/db-types/     # Shared generated/handwritten TS types
  caremate/              # Expo mobile app (SQLite + sync)
  caremate-portal/       # Next.js admin portal
```

## Responsibilities

| Path | Owns |
|------|------|
| `supabase/` | Cloud schema only — Auth-adjacent tables, catalogs, RLS, Storage |
| `caremate/src/database/` | Device SQLite (Drizzle). Must stay **aligned** with shared cloud tables via sync mappers |
| `packages/db-types/` | TypeScript `Database` types consumed by portal (and future apps) |
| Apps | UI + feature logic; never fork migration history |

## Prerequisites

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Linked project ref: `eybakmhqtotoywwgwgjy`

## Shared database

From **this repo root**:

```bash
npm run supabase:link          # once per machine
npm run supabase:migration:new -- add_something
npm run supabase:db:push
npm run db:types               # refresh packages/db-types after schema changes
```

Do **not** add a second `supabase/migrations` folder under an app.

When you change a table that mobile syncs, update in the same change set:

1. `supabase/migrations/*`
2. `caremate/src/database/schema.ts` + repository/sync handlers
3. `caremate/docs/supabase-alignment.md`
4. `npm run db:types` (portal types)

Portal-only tables (e.g. `admin_audit_events`) stay cloud-only — no SQLite mirror.

## Apps

### Mobile (`caremate/`)

```bash
cd caremate && npm install && npm start
```

Proxies for DB ops (still run migrations from root):

```bash
cd caremate && npm run supabase:db:push   # → repo root
```

### Admin portal (`caremate-portal/`)

```bash
cd caremate-portal && cp .env.example .env.local   # fill keys
cd .. && npm run supabase:db:push                 # apply schema first
cd caremate-portal && npm install && npm run bootstrap:admin -- you@example.com admin
npm run dev
```

## Former remotes

Nested app remotes were parked as `.git.bak-pre-monorepo` under each app while consolidating into this monorepo.

- Mobile previously: `https://github.com/softlyft/caremate.git`

After you create / point a new monorepo remote:

```bash
git remote add origin <new-ecosystem-repo-url>
git add .
git commit -m "chore: adopt caremate-ecosystem monorepo"
git push -u origin main
```

Then delete `**/.git.bak-pre-monorepo` once you confirm history is where you want it.

## Adding a future app

1. Add `caremate-<name>/` at repo root.
2. Consume `@caremate/db-types` and the same Supabase project env vars.
3. Put any new cloud schema only in `supabase/migrations/`.
