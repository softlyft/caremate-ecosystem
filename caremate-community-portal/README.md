# CareMate Community Portal

Contributor-facing portal for the CareMate Community Network — verify with a CareMate Patient ID,
join an admin-created chapter, participate in events, access resources, and earn recognition.

## Quick start

```bash
cp .env.example .env.local
npm run community-portal:dev
```

Open [http://localhost:4001](http://localhost:4001).

## Docs

| Topic | File |
|-------|------|
| Docs index | [docs/README.md](./docs/README.md) |
| Architecture | [docs/architecture.md](./docs/architecture.md) |
| Auth & enrollment | [docs/auth.md](./docs/auth.md) |
| Data model | [docs/data-model.md](./docs/data-model.md) |
| Local development | [docs/development.md](./docs/development.md) |
| QA checklist | [docs/qa-testing.md](./docs/qa-testing.md) |

Public marketing and user guide: [`caremate-website`](../caremate-website/README.md) `/ccn` and `/ccn/guide`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 4001 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (roles, leaderboard) |
| `npm run bootstrap:member` | Seed a membership for an existing Auth user (requires service role) |

Admin management lives in **caremate-admin-portal** under `/dashboard/community/*`.
