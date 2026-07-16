# Development

## Prerequisites

- Node 20+
- Repo dependencies installed from the monorepo root
- Supabase CLI linked to the shared project

## Environment

Copy:

```bash
cp caremate-portal/.env.example caremate-portal/.env.local
```

Required variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Shared Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/session client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged operations |
| `PROVIDER_INGEST_URL` | Provider ingestion service base URL |
| `PROVIDER_INGEST_API_KEY` | Bearer key for provider uploads |

## Local Setup

From the repo root:

```bash
npm run supabase:link
npm run supabase:db:push
npm install
```

Bootstrap a staff user:

```bash
npm run bootstrap:admin -w caremate-portal -- you@example.com admin
```

Run the portal:

```bash
npm run portal:dev
```

Or directly from the workspace:

```bash
npm run dev -w caremate-portal
```

## Useful Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev -w caremate-portal` | Start development server |
| `npm run build -w caremate-portal` | Production build |
| `npm run lint -w caremate-portal` | ESLint |
| `npm run typecheck -w caremate-portal` | TypeScript check |
| `npm run test -w caremate-portal` | Current unit tests |
| `npm run seed:articles -w caremate-portal` | Bootstrap articles |
| `npm run seed:tips -w caremate-portal` | Bootstrap health tips |
| `npm run seed:catalogs -w caremate-portal` | Bootstrap multiple catalogs |

## Testing

Current automated test coverage is intentionally small:

- `src/constants/roles.test.ts`

This covers RBAC helper logic only.

## Operational Notes

- The portal assumes the shared Supabase schema is already migrated
- Provider upload requires the FastAPI ingestion service to be reachable
- Payment secrets must be configured in Supabase Edge Functions, not in portal env files
