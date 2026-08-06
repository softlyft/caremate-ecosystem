# Amplify Hosting — website, payment, admin portal, provider portal, community portal

Deploy all five web apps from this monorepo via **AWS Amplify Hosting** (GitHub/GitLab/Bitbucket → branch **`main`**).

| Amplify app (suggested name) | App root (monorepo) | Framework | Build output |
|------------------------------|---------------------|-----------|--------------|
| `caremate-website` | `caremate-website` | Vite static SPA | `caremate-website/dist` |
| `caremate-payment-gateway` | `caremate-payment-gateway` | Vite static SPA | `caremate-payment-gateway/dist` |
| `caremate-admin-portal` | `caremate-admin-portal` | Next.js 15 (SSR) | `caremate-admin-portal/.next` |
| `caremate-provider-portal` | `caremate-provider-portal` | Next.js 15 (SSR) | `caremate-provider-portal/.next` |
| `caremate-community-portal` | `caremate-community-portal` | Next.js 15 (SSR) | `caremate-community-portal/.next` |

The shared monorepo build spec is [`amplify.yml`](../amplify.yml) at the repository root. Amplify only reads a committed build spec from that location. It selects the matching application using `AMPLIFY_MONOREPO_APP_ROOT`.

Install runs once per **affected** app build via [`scripts/amplify-install.sh`](../scripts/amplify-install.sh) (skips `npm ci` when the cached `node_modules` matches `package-lock.json`).

**Build cost controls (required for monorepo):**

1. **Build-level skip** — [`scripts/amplify-build-guard.sh`](../scripts/amplify-build-guard.sh) runs at the start of `preBuild` and wraps install/compile with `run` so skipped apps never call `npm ci` or `npm run build`. Look for `[amplify-build-guard] No changes under … — skipping` in logs. Baseline SHA is cached per app via Amplify `envCache`. Set `AMPLIFY_FORCE_BUILD=true` for a one-off full rebuild (env-var-only redeploy).
2. **Diff-based deploy** — set `AMPLIFY_DIFF_DEPLOY` = `true` on **each** Amplify app in Console. This can skip **deploy** when output is unchanged; the build guard avoids compile when files did not change. The log line `Determining if there are deployable frontend differences` is Amplify’s check — it may still run even when the guard skips compile.
3. **Node 22** — repo root [`.nvmrc`](../.nvmrc) pins Node 22. In each Amplify app: **Build settings → Build image settings → Node.js version → 22** (do not run `nvm install` in the spec).
4. **Shared `@caremate/db-types`** — listed in the build guard shared paths, so portal apps rebuild when db-types changes.

---

## Prerequisites

1. AWS account with Amplify Hosting access  
2. This Git repo connected to Amplify (GitHub App recommended)  
3. Branch **`main`** contains the root `amplify.yml`  
4. Supabase project URL + keys for portals and payment  

---

## Create each Amplify app (Console)

Repeat five times (once per row in the table).

1. **AWS Amplify Console** → **Create new app** → **Host web app** → connect your Git provider → select **caremate-ecosystem**.
2. Select branch **`main`**.
3. Enable **My app is a monorepo**.
4. Set **Monorepo app root** to the matching folder (`caremate-website`, `caremate-payment-gateway`, `caremate-admin-portal`, `caremate-provider-portal`, or `caremate-community-portal`).
5. Confirm Amplify detected the root `amplify.yml` (do not overwrite it with the auto “npm run build” template). Verify `AMPLIFY_MONOREPO_APP_ROOT` equals the selected folder exactly.
6. For **Next.js** apps (admin, provider, and community portals), leave Amplify on **Next.js SSR / WEB_COMPUTE** hosting (default when Next is detected). Do **not** flip the app to “Static” only.
7. Add environment variables (see below) **before** the first production deploy if possible. Also set **`AMPLIFY_DIFF_DEPLOY`** = `true` (if not already picked up from `amplify.yml`).
8. Under **Build settings → Build image settings**, set **Node.js version** to **22** (matches repo `.nvmrc`).
9. Save and deploy.

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
| `NEXT_PUBLIC_APP_URL` | Temporary: `https://main.d3gvtqx2uzn788.amplifyapp.com` (later `https://admin.getcaremate.com`) |
| `NEXT_PUBLIC_WEBSITE_URL` | Temporary: `https://main.dim7uuolmjgc9.amplifyapp.com` (password-reset redirect target) |
| `CURRENTS_API_KEY` | Server-only — Currents health news sync for External News admin |
| `PROVIDER_INGEST_URL` | Optional until ingest is hosted; production FastAPI base URL |
| `PROVIDER_INGEST_API_KEY` | Optional; must match ingest service |
| `SENTRY_DSN` | Optional — server/client error reporting |

Admin password resets email users to `{WEBSITE_URL}/auth/reset-password` (same Universal Link path as mobile).

Amplify Console → App → **Hosting** → **Environment variables** → apply to branch `main`.

### Provider portal (`caremate-provider-portal`)

| Key | Notes |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project as mobile / admin |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — mark as secret |
| `NEXT_PUBLIC_APP_URL` | Temporary: `https://main.d9xyppes84zqr.amplifyapp.com` (later `https://provider.getcaremate.com`) |
| `NEXT_PUBLIC_WEBSITE_URL` | Temporary: `https://main.dim7uuolmjgc9.amplifyapp.com` |

Do **not** expose claim or password-reset OTPs in the browser. OTPs are emailed via Edge Functions:

- `send-provider-claim-otp`
- `send-provider-password-reset-otp`

Both require SES secrets on the Supabase project. Also apply migrations for `provider_password_resets` and `provider_auth_otp_sends`.

Optional: set `SENTRY_DSN` (and optionally `SENTRY_ENVIRONMENT`) so server actions and `error.tsx` report exceptions.

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

### Temporary Amplify hosts (until custom domains are ready)

Use these Amplify default domains for env vars, EAS, emails, and cross-app links while `*.getcaremate.com` DNS is unfinished:

| App | Temporary host |
|-----|----------------|
| Main website | `https://main.dim7uuolmjgc9.amplifyapp.com` |
| Admin portal | `https://main.d3gvtqx2uzn788.amplifyapp.com` |
| Provider portal | `https://main.d9xyppes84zqr.amplifyapp.com` |
| Community portal | `https://main.d2tlpjx9a9kklb.amplifyapp.com` |
| Payment | `https://main.d1wcqa3tsdavz8.amplifyapp.com` |

Set matching values in each Amplify app’s **Environment variables**, mobile `eas.json` / `.env.*`, and Supabase Auth **Redirect URLs** (include `https://main.dim7uuolmjgc9.amplifyapp.com/auth/reset-password`). Redeploy after changing.

### Official CareMate hosts (target)

| App | Development | Production |
|-----|-------------|------------|
| Main website | `https://dev.getcaremate.com` | `https://getcaremate.com` |
| Admin portal | `https://admin-dev.getcaremate.com` | `https://admin.getcaremate.com` |
| Provider portal | `https://provider-dev.getcaremate.com` | `https://provider.getcaremate.com` |
| Community portal | `https://community-dev.getcaremate.com` | `https://community.getcaremate.com` |
| Payment | `https://pay-dev.getcaremate.com` | `https://pay.getcaremate.com` |

In each Amplify app → **Hosting** → **Custom domains**, attach the matching host. Point DNS (CNAME / ANAME) as Amplify instructs. Update Supabase Auth → **URL configuration** with the new portal / payment origins **and** https app-link redirects (`https://getcaremate.com/auth/reset-password`, plus `dev.` for DEV).

After the website is live, finish Universal / App Links verification:

1. Replace `TEAMID` in `caremate-website/public/.well-known/apple-app-site-association`
2. Replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` in `assetlinks.json` (Play Console → App signing)
3. Confirm `Content-Type: application/json` on both well-known paths (set in root `amplify.yml`)
4. Rebuild the mobile app so `associatedDomains` / `intentFilters` from `app.json` ship in the binary

Set public hosts in Amplify / EAS env (dev vs prod table above). For localhost, copy `.env.local.example` → `.env.local`. Documented defaults live in each package’s `.env.example`.

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

**Do not** rewrite `/.well-known/apple-app-site-association` or `/.well-known/assetlinks.json` — those must stay as static JSON for App / Universal Links verification.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `@caremate/db-types` not found | Confirm `buildPath: /` and `bash scripts/amplify-install.sh` in root `amplify.yml` |
| All 5 apps **build** on every push | Ensure `AMPLIFY_MONOREPO_APP_ROOT` is set per app; build guard in root `amplify.yml` should log skip — check logs for `amplify-build-guard.sh` |
| Build runs but **deploy skipped** | Expected with `AMPLIFY_DIFF_DEPLOY`; build guard prevents compile when appRoot unchanged |
| Force a full rebuild (env vars only) | Set `AMPLIFY_FORCE_BUILD=true` on that app, redeploy, then remove |
| Slow / redundant `npm ci` | Amplify cache must include `node_modules/**/*`; install script skips when lockfile unchanged |
| Build uses Node 18 | Set Node **22** in Amplify Console build image; repo `.nvmrc` is `22` (no `nvm install` in spec) |
| Next app treated as static | Recreate / ensure framework is Next.js WEB_COMPUTE; artifacts use `.next` |
| "Welcome / Your app will appear here once you complete your first deployment" placeholder for a Next.js portal | Switch to Next.js SSR: `aws amplify update-app --app-id <APP_ID> --platform WEB_COMPUTE`, then redeploy `main` |
| Amplify `!!! Internal error` immediately | Invalid `amplify.yml` / `customRules` — use the checked-in specs without `customRules`; set SPA rewrites in the Console |
| Payment shows missing Supabase env | Set `VITE_*` in Amplify and **redeploy** (Vite inlines at build) |
| Auth redirect errors after domain attach | Add Amplify URL to Supabase Auth redirect allow list |
| Provider catalog upload fails in admin | Set `PROVIDER_INGEST_URL` + API key to a reachable ingest deployment |
| **Cloudflare Pages still deploys on merge to `main`** | Not from this repo — disconnect or delete the Pages project in Cloudflare Console (see below) |

---

## Decommission Cloudflare Pages (AWS-only hosting)

Removing [`.github/workflows/static-pages-cd.yml`](../.github/workflows/static-pages-cd.yml) stops **GitHub Actions** deploys. It does **not** stop Cloudflare if a Pages project is still connected to GitHub directly.

If you still see a Cloudflare build when merging to `main`:

1. **Cloudflare Dashboard** → **Workers & Pages** → open projects such as `caremate-website` and `caremate-payment`.
2. For each project: **Settings** → **Builds & deployments** → **Disconnect** the Git repository (or **Delete project** if you no longer need it).
3. **GitHub** → repo **Settings** → **Integrations** → **Applications** → **Cloudflare Pages** (or **Cloudflare Workers and Pages**) → **Configure** → remove access to `caremate-ecosystem` if listed.
4. **GitHub** → **Settings** → **Environments** → **`prod`** → delete unused secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (if present).
5. **DNS** — if `getcaremate.com` / `pay.getcaremate.com` still CNAME to Cloudflare Pages, repoint them to the Amplify app custom domain instead.

After disconnecting, only Amplify (and your other GitHub workflows: CI, Mobile CD, Gateway CD) should run on push.

---

## Out of scope (this guide)

- Mobile (`caremate-mobile/`) — Expo / EAS / Play Store  
- Provider ingest (`caremate-provider-ingestion/`) — container / App Runner / EC2, not Amplify static hosting  
