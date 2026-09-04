# CareMate Payment

Lightweight Vite + React checkout host for CareMate Premium.

Website and community send visitors here with plan parameters. They sign in with an **existing**
CareMate email/password (or a mobile `#handoff=` session). This app calls `create-checkout`,
sends the user to Paystack (NGN or USD), then verifies the charge on `/success`.

Store apps buy Premium through Apple / Google, not this host.

## Local setup

```bash
cp .env.example .env
# Fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (same project as the mobile app)

npm run payment:dev
# → http://localhost:5174
```

## Query params

| Param | Required | Notes |
|-------|----------|-------|
| `plan_type` | yes | `personal` \| `family` |
| `billing_interval` | yes | `monthly` \| `yearly` |
| `currency` | yes | `NGN` \| `USD` (both via Paystack) |
| `source` | no | `website` \| `community` \| omitted (app / handoff) |
| `household_id` | family | Optional; `create-checkout` looks up `family_members` if omitted |
| `patient_id` | no | Display only; loaded from profile if omitted |
| `return_success` | no | App: `caremate://billing/success`. Web: pricing or community profile URL |
| `return_cancel` | no | App: `caremate://billing/cancel`. Web: same host as success |

Auth from the app uses a **single-use** hash code (never put tokens in the URL):

`#handoff=…`

Without a handoff, the page shows email/password sign-in. There is no register — create the
account in the CareMate app first.

Legacy `#access_token=…&refresh_token=…` is ignored.

Return URLs are allowlisted (`caremate://billing/success|cancel` and `getcaremate.com` /
Amplify / localhost https). See [`docs/security.md`](../docs/security.md).

## Flow

1. Website `/pricing`, community Subscribe, or (legacy) mobile handoff opens this app
2. User signs in if needed → confirms plan → Paystack
3. Provider returns to `/success?reference=…` or `/cancel`
4. `/success` calls `verify-checkout` (webhooks also finalize)
5. App returns: deep-link into CareMate. Web returns: stay on success and tell the user to open the app

## Deploy

Monorepo Amplify app root: `caremate-payment-gateway` (branch **`main`**). Spec: [`../amplify.yml`](../amplify.yml).

1. Create Amplify app → branch **`main`** → monorepo root `caremate-payment-gateway`.
2. Set build-time env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WEBSITE_URL`, `VITE_COMMUNITY_PORTAL_URL`.
3. After deploy, set SPA rewrite in Amplify Console (see [`docs/amplify-hosting.md`](../docs/amplify-hosting.md)).
4. Set website `VITE_PAYMENT_URL` and community `NEXT_PUBLIC_PAYMENT_URL` to this origin
   (`https://pay-dev.getcaremate.com` or `https://pay.getcaremate.com`).

Full guide (all web apps): [`../docs/amplify-hosting.md`](../docs/amplify-hosting.md).

### Device notes

- iOS Simulator can use `http://localhost:5174`
- Android Emulator typically needs `http://10.0.2.2:5174`
- Physical devices need your machine LAN IP
- Dev server binds `0.0.0.0:5174` so emulator/LAN clients can connect
