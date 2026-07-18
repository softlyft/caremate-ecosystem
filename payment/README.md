# CareMate Payment

Lightweight Vite + React checkout host for CareMate Premium.

The mobile app opens this site with plan parameters and a short-lived Supabase session.
This app calls the existing `create-checkout` Edge Function, sends the user to Paystack (NGN)
or Stripe (USD), then deep-links back into CareMate.

**Standard → Family upgrades** do not use this confirm page: mobile calls `create-upgrade` and opens
the gateway URL directly. This site still hosts `/success` and `/cancel` return pages for those flows.

## Local setup

```bash
cp .env.example .env
# Fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (same project as the mobile app)

npm run payment:dev
# → http://localhost:5174
```

## Query params from mobile

| Param | Required | Notes |
|-------|----------|-------|
| `plan_type` | yes | `personal` \| `family` |
| `billing_interval` | yes | `monthly` \| `yearly` |
| `currency` | yes | `NGN` (Paystack) \| `USD` (Stripe). Mobile picks this from country (`NG` → NGN; otherwise USD). |
| `household_id` | family | Family household id |
| `patient_id` | no | Display only; loaded from profile if omitted |
| `return_success` | no | Default `caremate://billing/success` |
| `return_cancel` | no | Default `caremate://billing/cancel` |

Auth handoff uses the URL hash:

`#access_token=…&refresh_token=…`

## Flow

1. CareMate Premium → Pay
2. Opens `/payment?plan_type=…&…#access_token=…`
3. User confirms → `create-checkout` creates a **pending payment** → Paystack/Stripe hosted page
4. Provider returns to `/success?reference=…` or `/cancel`
5. Page deep-links to `caremate://billing/success?reference=…`
6. Mobile calls `verify-checkout` (and webhooks also finalize) → payment succeeded + **subscription** active
7. Mobile pulls entitlements

## Deploy

Host the Vite build (`npm run payment:build` → `payment/dist`) on any static host
(Vercel, Netlify, Cloudflare Pages, S3+CDN). Configure SPA fallback so `/success`
and `/cancel` serve `index.html`. Set `EXPO_PUBLIC_PAYMENT_URL` in the mobile app
to that origin.

### Device notes

- iOS Simulator can use `http://localhost:5174`
- Android Emulator typically needs `http://10.0.2.2:5174`
- Physical devices need your machine LAN IP (and matching CORS is not required for this static app)
- Dev server binds `0.0.0.0:5174` so emulator/LAN clients can connect (restart `payment:dev` after config changes)
