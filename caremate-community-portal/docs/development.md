# Community Portal — Development

## Prerequisites

- Node 20+
- Supabase project with community migration applied
- Monorepo dependencies installed from root: `npm ci`

## Local run

From monorepo root:

```bash
npm run community-portal:dev
```

Or from this package:

```bash
cp .env.example .env.local
npm run dev
```

## Apply migration

```bash
npm run supabase:db:push
npm run db:types
```

## Bootstrap test membership

```bash
npm run bootstrap:member -- user@example.com <chapter-id>
```

Requires an existing Auth user (or `--create --password …`) and `SUPABASE_SERVICE_ROLE_KEY`.
The script assigns `community_memberships` and ensures a canonical `profiles` row — it does not
write duplicate community identity data.

## Tests

```bash
npm run test
npm run typecheck
```
