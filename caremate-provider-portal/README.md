# CareMate Provider Portal

Patient engagement portal for provider organizations. **Not** an HMS/EHR.

Same Supabase project as the CareMate monorepo. Org catalog reuses `provider_organizations`; portal fields live in `provider_profiles`. Access requires a `provider_org_members` row.

**Docs:** [`docs/README.md`](./docs/README.md) — architecture, auth/claim, connections, data model, development, QA.

## Quick start

```bash
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Apply provider portal migrations (see docs/data-model.md), then:
npm run provider-portal:dev
```

Dev server: **http://localhost:4000**

## Access

| Path | Purpose |
|------|---------|
| `/claim` | Claim unclaimed org by catalog email → verify code → set admin password (org becomes **verified**) |
| `/login` | Sign in after claim |
| `/app/*` | Dashboard, patients, connections, docs, messages, … |

No self-serve registration. Ops fallback:

```bash
npm run bootstrap:member -w caremate-provider-portal -- user@example.com <organization-uuid> owner --create --password 'secret'
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | `next dev -p 4000` |
| `build` / `start` | Production build / serve |
| `lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `bootstrap:member` | Seed `provider_org_members` (+ verified profile stub) |

## Further reading

| Topic | Doc |
|-------|-----|
| Connections (bidirectional, rejection reason, verification gate) | [docs/connections.md](./docs/connections.md) |
| Claim + RBAC | [docs/auth-claim.md](./docs/auth-claim.md) |
| Schema / migrations / RPCs | [docs/data-model.md](./docs/data-model.md) |
| Local setup | [docs/development.md](./docs/development.md) |
