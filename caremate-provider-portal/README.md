# CareMate Care Portal

Care Portal for **providers** and **payers**. Provider surface remains a patient engagement channel (**not** an HMS/EHR). Payer surface is a separate stub workspace under `/payer/*`.

Same Supabase project as the CareMate monorepo. Package folder stays `caremate-provider-portal` (host `app.getcaremate.com`).

**Docs:** [`docs/README.md`](./docs/README.md) — architecture, auth/claim, connections, data model, development, QA.

## Quick start

```bash
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Apply Care Portal migrations (see docs/data-model.md), then:
npm run provider-portal:dev
```

Dev server: **http://localhost:4000**

## Access

| Path | Purpose |
|------|---------|
| `/claim` | Claim unclaimed provider or payer org by catalog email → OTP → admin password |
| `/login` | Sign in after claim (routes to `/app` or `/payer` by membership) |
| `/app/*` | Provider dashboard, patients, connections, docs, messages, … |
| `/payer/*` | Payer stub dashboard, org profile, settings |

No self-serve registration. Ops fallback (providers):

```bash
npm run bootstrap:member -w caremate-provider-portal -- user@example.com <organization-uuid> owner --create --password 'secret'
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | `next dev -p 4000` |
| `build` / `start` | Production build / serve |
| `lint` / `typecheck` | Quality |
| `bootstrap:member` | Seed provider membership |

## Related

- [Auth & claim](./docs/auth-claim.md)
- [Data model](./docs/data-model.md)
- [Architecture](./docs/architecture.md)
