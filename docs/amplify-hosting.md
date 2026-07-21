# Amplify Hosting — website, payment, admin portal, provider portal, community portal

Deploy five Amplify apps from this monorepo (GitHub/GitLab/Bitbucket → branch **`main`**).

| Amplify app (suggested name) | App root (monorepo) | Framework | Build output |
|------------------------------|---------------------|-----------|--------------|
| `caremate-website` | `caremate-website` | Vite static SPA | `caremate-website/dist` |
| `caremate-payment-gateway` | `caremate-payment-gateway` | Vite static SPA | `caremate-payment-gateway/dist` |
| `caremate-admin-portal` | `caremate-admin-portal` | Next.js 15 (SSR) | `caremate-admin-portal/.next` |
| `caremate-provider-portal` | `caremate-provider-portal` | Next.js 15 (SSR) | `caremate-provider-portal/.next` |
| `caremate-community-portal` | `caremate-community-portal` | Next.js 15 (SSR) | `caremate-community-portal/.next` |

Build specs live next to each app:

- [`caremate-website/amplify.yml`](../caremate-website/amplify.yml)
- [`caremate-payment-gateway/amplify.yml`](../caremate-payment-gateway/amplify.yml)
- [`caremate-admin-portal/amplify.yml`](../caremate-admin-portal/amplify.yml)
- [`caremate-provider-portal/amplify.yml`](../caremate-provider-portal/amplify.yml)
- Community portal: reuse the Next.js monorepo Amplify pattern from the provider portal (app root `caremate-community-portal`) until a dedicated `amplify.yml` is added beside that package

Install always runs from the **repo root** (`npm ci`) so npm workspaces and `@caremate/db-types` resolve.

---

## Prerequisites

1. AWS account with Amplify Hosting access  
2. This Git repo connected to Amplify (GitHub App recommended)  
3. Branch **`main`** contains the `amplify.yml` files above  
4. Supabase project URL + keys for portals and payment  

---

## Create each Amplify app (Console)

Repeat five times (once per row in the table).

1. **AWS Amplify Console** → **Create new app** → **Host web app** → connect your Git provider → select **caremate-ecosystem**.
2. Select branch **`main`**.
3. Enable **My app is a monorepo**.
4. Set **Monorepo app root** to the matching folder (`caremate-website`, `caremate-payment-gateway`, `caremate-admin-portal`, `caremate-provider-portal`, or `caremate-community-portal`).
5. Confirm Amplify detected `amplify.yml` in that folder (do not overwrite with the auto “npm run build” template).
6. For **Next.js** apps (admin + provider portals), leave Amplify on **Next.js SSR / WEB_COMPUTE** hosting (default when Next is detected). Do **not** flip the app to “Static” only.
7. Add environment variables (see below) **before** the first production deploy if possible.
8. Save and deploy.

Suggested Amplify app names:

- `caremate-website`
- `caremate-payment-gateway`
- `caremate-admin-portal`
- `caremate-provider-portal`

---

## Environment variables

### Website (`caremate-website`)

None required.

### Payment checkout (`caremate-payment-gateway`)

Vite bakes these in at **build** time — set them in Amplify **before** deploy (or redeploy after changing).

| Key | Notes |
|-----|--------|
| `VITE_SUPABASE_URL` | Same Supabase project as mobile |
| `VITE_SUPABASE_ANON_KEY` | Anon / publishable key (not service role) |

Paystack / Stripe **secrets** stay on Supabase Edge Functions (`create-checkout`, webhooks) — not in this Amplify app.

After the payment domain is live, point the mobile app’s hosted checkout base URL at it (see CareMate billing / env config for the payment host).

### SoftLyft admin portal (`caremate-admin-portal`)

| Key | Notes |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — mark as secret in Amplify |
| `PROVIDER_INGEST_URL` | Optional until ingest is hosted; production FastAPI base URL |
| `PROVIDER_INGEST_API_KEY` | Optional; must match ingest service |

Amplify Console → App → **Hosting** → **Environment variables** → apply to branch `main`.

### Provider portal (`caremate-provider-portal`)

| Key | Notes |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project as mobile / admin |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — mark as secret |

After changing env vars, **Redeploy** the branch.

---

## Verify builds locally (optional)

From repo root:

```bash
npm ci
npm run website:build
npm run payment:build
npm run portal:build
npm run provider-portal:build
```

Expect:

- `caremate-website/dist/`
- `caremate-payment-gateway/dist/`
- `caremate-admin-portal/.next/`
- `caremate-provider-portal/.next/`

---

## Custom domains (after first green deploy)

In each Amplify app → **Hosting** → **Custom domains**:

| App | Example domain |
|-----|----------------|
| Website | `caremate.app` / `www.caremate.app` |
| Payment | `pay.caremate.app` or `checkout.caremate.app` |
| Admin portal | `admin.caremate.app` or `portal.softlyft...` |
| Provider portal | `providers.caremate.app` |
| Community portal | `community.caremate.app` |

Point DNS (CNAME / ANAME) as Amplify instructs. Update Supabase Auth → **URL configuration** with the new portal / payment origins (redirect / site URL allow lists).

---

## SPA routing (website + payment)

Do **not** put complex SPA regex rules in `amplify.yml` (Amplify can fail with `!!! Internal error` before the build starts).

After the first green deploy, add this rewrite in Amplify Console → **Hosting** → **Rewrites and redirects**:

| Source address | Target address | Type |
|----------------|----------------|------|
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|jpeg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp)$)([^.]+$)/>` | `/index.html` | `200` (Rewrite) |

Or the simpler catch-all used by many Vite SPAs:

| Source | Target | Type |
|--------|--------|------|
| `/<*>` | `/index.html` | `404` (Rewrite to 200) |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `@caremate/db-types` not found | Confirm app root + `cd .. && npm ci` in `amplify.yml` (install at monorepo root) |
| Next app treated as static | Recreate / ensure framework is Next.js WEB_COMPUTE; artifacts use `.next` |
| Build uses Node 18 | `amplify.yml` installs Node 22 via `nvm` |
| Amplify `!!! Internal error` immediately | Invalid `amplify.yml` / `customRules` — use the checked-in specs without `customRules`; set SPA rewrites in the Console |
| Payment shows missing Supabase env | Set `VITE_*` in Amplify and **redeploy** (Vite inlines at build) |
| Auth redirect errors after domain attach | Add Amplify URL to Supabase Auth redirect allow list |
| Provider catalog upload fails in admin | Set `PROVIDER_INGEST_URL` + API key to a reachable ingest deployment |

---

## Out of scope (this guide)

- Mobile (`caremate-mobile/`) — Expo / EAS / Play Store  
- Provider ingest (`caremate-provider-ingestion/`) — container / App Runner / EC2, not Amplify static hosting  
