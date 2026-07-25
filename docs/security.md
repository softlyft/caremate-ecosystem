# CareMate Ecosystem Security

Cross-service security layer for everything **outside** the mobile app. Mobile controls live in [`caremate-mobile/docs/security.md`](../caremate-mobile/docs/security.md).

---

## Surfaces in scope

| Surface | Path | Primary risks |
|---------|------|---------------|
| Edge Functions | `supabase/functions/` | Auth bypass, IDOR, webhook forgery, open redirects |
| Payment gateway | `caremate-payment-gateway/` | DOM XSS via return URLs, session leakage, token-in-URL |
| Admin portal | `caremate-admin-portal/` | RBAC, media upload abuse, missing browser headers |
| Provider portal | `caremate-provider-portal/` | Org claim OTP leak, document upload abuse |
| Community portal | `caremate-community-portal/` | Patient-ID join OTP leak |
| Supabase schema / RLS | `supabase/migrations/` | Cross-tenant data access |

Out of scope here: App Store / Play disclosures, Amplify account IAM (see [`amplify-hosting.md`](./amplify-hosting.md)).

---

## Threat models we design for

| Threat | Controls |
|--------|----------|
| Checkout return URL → `javascript:` / phishing host | Allowlisted `caremate://billing/*` + `*.getcaremate.com` / localhost (`_shared/return-url.ts`, payment `return-url.ts`) |
| Session tokens in browser URL | Single-use `#handoff=` codes; legacy `#access_token` ignored |
| Concurrent handoff race | Exchange updates `used_at` with `.is('used_at', null)` + `.select()`; clear tokens after claim |
| Family billing IDOR (`household_id`) | `assertHouseholdMembership` on create-checkout / upgrade quote |
| Stripe webhook replay | HMAC verify + **5-minute** timestamp window + constant-time compare |
| Join / org-claim OTP returned to client | OTPs are never returned to the browser; email OOB only |
| Malicious uploads | MIME + size checks on admin learn-media and provider documents |
| Clickjacking / MIME sniffing | Portal `next.config` security headers (XFO, nosniff, Referrer-Policy, HSTS, Permissions-Policy) |

---

## Checkout & billing

### Handoff flow

1. Mobile (authenticated) → `create-checkout-handoff` stores tokens server-side (~5 min TTL).
2. Browser opens payment app with `#handoff={code}` only.
3. Gateway `hydrateSessionFromHash` calls `exchange-checkout-handoff` once over HTTPS.
4. Exchange atomically marks the row used and **nulls** stored tokens.
5. Success / Cancel pages call `signOut` before returning to the app; sessions are not persisted (`persistSession: false`).

Migration: `20260723120000_checkout_handoffs_clear_tokens.sql` (tokens nullable after use).

### Return URLs

Accepted:

- `caremate://billing/success` / `caremate://billing/cancel` (optional query)
- `https://` payment-gateway `/success` or `/cancel` on allowlisted hosts (`*.getcaremate.com`, `*.amplifyapp.com`, localhost), with nested `return=` also allowlisted

Rejected: `javascript:`, `data:`, arbitrary hosts, other `caremate://` paths, HTTPS paths other than `/success` or `/cancel`.

Enforced in Edge `create-checkout` / `create-upgrade` and in the payment gateway before `window.location.href`.

### Household membership

Family checkouts and upgrade quotes resolve `household_id`, then verify the caller is a `family_members` row or `family_households.created_by_user_id`.

---

## Portal OTPs (join & org claim)

| Flow | Production | Local / non-production |
|------|------------|------------------------|
| Community Patient ID verify | Hash stored server-side; code never returned to the browser | Must send OOB email (follow-up) |
| Provider org claim | Hash stored; code never returned | Emails via `send-provider-claim-otp` + SES |
| Provider password reset | Hash stored; code never returned | Emails via `send-provider-password-reset-otp` + SES |

**Provider claim / reset:** Edge Functions email the 6-digit code with SES. Codes are never returned to the browser. Sends are throttled (`provider_auth_otp_sends`: ~1/min per email, daily + IP caps). Password-reset responses stay opaque even when SES fails.

---

## Uploads

| Portal | Limits |
|--------|--------|
| Admin learn media | ≤ 15 MB; JPEG/PNG/WebP/GIF/MP4/WebM |
| Provider documents | ≤ 20 MB; PDF/JPEG/PNG/WebP/TXT/Word |

Validation is in server actions (not only the browser).

---

## Browser security headers (Next portals)

Applied via `next.config.ts` on admin, provider, and community:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo/payment off)
- `Strict-Transport-Security` (long max-age)
- Provider and admin portals set a baseline `Content-Security-Policy` (`upgrade-insecure-requests`, production without `unsafe-eval`; nonces still a follow-up)

A stricter CSP with nonces across all portals is a follow-up (Next App Router needs careful nonce wiring).

---

## Secrets & clients

| Do | Don't |
|----|-------|
| Use anon key + user JWT in browsers / mobile | Ship `service_role` to any client |
| Edge Functions: service role only on the server | Trust client `household_id` / return URLs without checks |
| Stripe / Paystack secrets in Edge env only | Verify webhooks without signature (+ time bound for Stripe) |

---

## Deploy checklist (after this hardening)

- [ ] `supabase db push` (handoff token nullability migration)
- [ ] Redeploy Edge: `create-checkout`, `create-upgrade`, `exchange-checkout-handoff`, `billing-webhook-stripe`
- [ ] Redeploy payment gateway + three Next portals
- [x] Wire OOB email for provider claim (`send-provider-claim-otp` + SES)
- [x] Wire OOB email for provider password reset (`send-provider-password-reset-otp` + SES)
- [x] Apply `provider_password_resets` + auth hardening migrations
- [ ] Wire OOB email for community join before cutting over production join UX

---

## Related docs

- Mobile: [`caremate-mobile/docs/security.md`](../caremate-mobile/docs/security.md)
- Supabase auth/RLS: [`supabase/docs/auth-and-rls.md`](../supabase/docs/auth-and-rls.md)
- Admin RBAC: [`caremate-admin-portal/docs/auth-rbac.md`](../caremate-admin-portal/docs/auth-rbac.md)
- Provider claim: [`caremate-provider-portal/docs/auth-claim.md`](../caremate-provider-portal/docs/auth-claim.md)
