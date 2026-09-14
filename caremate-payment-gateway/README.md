# CareMate Payment

Lightweight Vite + React checkout host for **all CareMate Paystack payments**:

- Patient Premium (website + community)
- Provider Private Care Team (Care Portal)
- Payer Support Team (Care Portal)

Surface apps redirect here with plan parameters (and an optional `#handoff=` / `?handoff=` session).
This app shows the price from the correct catalog, calls the matching Edge Function
(`create-checkout`, `create-provider-org-checkout`, or `create-payer-org-checkout`), sends the
user to Paystack, then verifies the charge on `/success` via `verify-checkout`.

Care Portal must **not** call org checkout Edge Functions directly — it opens this host instead.

Store apps buy Premium through Apple / Google, not this host.

## Local setup

```bash
cp .env.example .env
# Fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (same project as the mobile app)

npm run payment:dev
# → http://localhost:5174
```

## Query params

### Patient Premium (`product` omitted or `premium`)

| Param | Required | Notes |
|-------|----------|-------|
| `plan_type` | yes | `personal` \| `family` |
| `billing_interval` | yes | `monthly` \| `yearly` |
| `currency` | yes | `NGN` \| `USD` (both via Paystack) |
| `source` | no | `website` \| `community` \| omitted (app / handoff) |
| `household_id` | family | Optional; `create-checkout` looks up `family_members` if omitted |
| `patient_id` | no | Display only; loaded from profile if omitted |
| `return_success` / `return_cancel` | no | Allowlisted CareMate URLs or deep links |

### Org plans (`product=provider_org` \| `payer_org`)

| Param | Required | Notes |
|-------|----------|-------|
| `product` | yes | `provider_org` \| `payer_org` |
| `organization_id` | yes | Org UUID (membership re-checked in Edge) |
| `plan_tier` | yes | `basic` \| `pro` |
| `billing_interval` | yes | `monthly` \| `yearly` |
| `currency` | yes | `NGN` only |
| `source` | no | `care_portal_provider` \| `care_portal_payer` |
| `return_success` / `return_cancel` | no | Care Portal billing + website pricing fallbacks |

Auth uses a **single-use** handoff code (never put tokens in the URL):

`#handoff=…` or `?handoff=…`

Without a handoff, the page shows email/password sign-in.

Return URLs are allowlisted (`caremate://billing/success|cancel` and `getcaremate.com` /
Amplify / localhost https). See [`docs/security.md`](../docs/security.md).

## Flow

1. Website `/pricing`, community Subscribe, or Care Portal billing opens this app
2. User signs in if needed → confirms plan → Paystack
3. Provider returns to `/success?reference=…` or `/cancel`
4. `/success` calls `verify-checkout` (routes `cm_` / `pog_` / `pyo_`; webhooks also finalize)
5. Returns to the source app (CareMate deep link, website/community, or Care Portal billing)

## Deploy

Monorepo Amplify app root: `caremate-payment-gateway` (branch **`main`**). Spec: [`../amplify.yml`](../amplify.yml).

1. Create Amplify app → branch **`main`** → monorepo root `caremate-payment-gateway`.
2. Set build-time env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WEBSITE_URL`, `VITE_COMMUNITY_PORTAL_URL`, `VITE_CARE_PORTAL_URL`.
3. After deploy, set SPA rewrite in Amplify Console (see [`docs/amplify-hosting.md`](../docs/amplify-hosting.md)).
4. Set website `VITE_PAYMENT_URL`, community `NEXT_PUBLIC_PAYMENT_URL`, and Care Portal `NEXT_PUBLIC_PAYMENT_URL` to this origin.

Full guide (all web apps): [`../docs/amplify-hosting.md`](../docs/amplify-hosting.md).
