# Cloudflare Pages — website & payment (prod)

Static Vite apps deploy to **Cloudflare Pages** on merge / push to branch **`prod`**.

| App | Package | Default Pages project | Production host |
|-----|---------|----------------------|-----------------|
| Marketing website | `caremate-website` | `caremate-website` | `https://getcaremate.com` |
| Payment checkout | `caremate-payment-gateway` | `caremate-payment` | `https://pay.getcaremate.com` |

Workflow: [`.github/workflows/static-pages-cd.yml`](../.github/workflows/static-pages-cd.yml).

Amplify remains documented for portals (and may still build from `main`). Prefer Cloudflare for website + payment production traffic once DNS is cut over.

---

## One-time setup

### 1. Cloudflare Pages projects

In Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Upload assets** (Direct Upload):

1. Create project **`caremate-website`**
2. Create project **`caremate-payment`**
3. For each project → **Settings** → **Builds & deployments** → set **Production branch** to **`prod`**

(First `wrangler pages deploy` can also create the project if the token allows.)

### 2. API token

Create an API token with:

- Account → **Cloudflare Pages** → **Edit**
- Include the account that owns the Pages projects

### 3. GitHub Environment `prod`

Repo → **Settings** → **Environments** → **`prod`** (reuse the Gateway CD environment).

**Secrets**

| Name | Purpose |
|------|---------|
| `CLOUDFLARE_API_TOKEN` | Token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |
| `VITE_SUPABASE_URL` | Payment build (same Supabase as mobile) |
| `VITE_SUPABASE_ANON_KEY` | Payment build (anon key) |

**Variables** (optional overrides)

| Name | Default |
|------|---------|
| `CLOUDFLARE_PAGES_PROJECT_WEBSITE` | `caremate-website` |
| `CLOUDFLARE_PAGES_PROJECT_PAYMENT` | `caremate-payment` |
| `VITE_SITE_URL` | `https://getcaremate.com` |
| `VITE_COMMUNITY_PORTAL_URL` | `https://community.getcaremate.com` |
| `VITE_PAYMENT_SITE_URL` | `https://pay.getcaremate.com` |
| `VITE_WEBSITE_URL` | `https://getcaremate.com` |

### 4. Custom domains

In each Pages project → **Custom domains**:

- Website → `getcaremate.com` (+ `www` if needed)
- Payment → `pay.getcaremate.com`

Point DNS as Cloudflare instructs. Then update Supabase Auth redirect allowlists for payment / website origins.

### 5. Mobile / clients

After cutover, production mobile / EAS env should use:

- Website / legal / Universal Links → `https://getcaremate.com`
- Checkout host → `https://pay.getcaremate.com`

---

## Trigger

| Event | Effect |
|-------|--------|
| Push / merge to `prod` changing `caremate-website/**` or `caremate-payment-gateway/**` | Build + deploy both apps |
| Actions → **Static Pages CD** → `workflow_dispatch` | Deploy `all` / `website` / `payment` |

Deploy uses `wrangler pages deploy … --branch=prod` so the deployment is treated as **production** when the Pages production branch is `prod`.

---

## SPA routing & headers

Copied into `dist` via Vite `public/`:

| File | Purpose |
|------|---------|
| `caremate-website/public/_redirects` | `/* → /index.html` (200); static `/.well-known/*` still served as files |
| `caremate-website/public/_headers` | JSON `Content-Type` for App / Universal Link association files |
| `caremate-payment-gateway/public/_redirects` | SPA fallback for `/success`, `/cancel`, etc. |

---

## Manual deploy (optional)

```bash
npm ci
npm run website:build
npx wrangler pages deploy caremate-website/dist --project-name=caremate-website --branch=prod

VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm run payment:build
npx wrangler pages deploy caremate-payment-gateway/dist --project-name=caremate-payment --branch=prod
```

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment.

---

## Related

- [Amplify hosting](./amplify-hosting.md) — portals + legacy web notes
- [Gateway CD](../caremate-health-data-gateway/README.md) — also deploys on `prod`
- Website package: [`../caremate-website/README.md`](../caremate-website/README.md)
- Payment package: [`../caremate-payment-gateway/README.md`](../caremate-payment-gateway/README.md)
