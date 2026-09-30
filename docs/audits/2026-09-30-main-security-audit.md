# CareMate main-branch security audit

**Date:** 2026-09-30  
**Scope:** `origin/main` at `cbf0610d` (post PR #169 prod-readiness / #163 Fix security)  
**Surfaces:** Edge Functions, payment gateway, Next portals, Supabase RLS, provider ingestion, health-data gateway, mobile controls (docs + critical paths), CI/CD  
**Out of scope:** Live cloud IAM / Amplify Console config, App Store disclosures, runtime penetration testing against prod

This audit verifies that controls described in [`docs/security.md`](../security.md) and [`caremate-mobile/docs/security.md`](../../caremate-mobile/docs/security.md) are present in code, and looks for residual gaps after the recent hardening pass.

---

## Executive summary

Post-hardening controls for checkout handoff, return-URL allowlisting, Stripe/Paystack webhook signatures, OOB OTPs, admin RBAC, and portal upload size limits are **largely implemented and match the threat model**.

No Critical issues were confirmed in static review. Several **High/Medium** residual risks remain: payment-gateway session persistence contradicts the security doc, community RLS allows global profile/phone reads and arbitrary notification inserts, provider document MIME checks are extension-based (no magic-byte sniff), Edge CORS is fully open, community portal lacks CSP, and the deploy checklist still has unchecked production cutover items.

---

## Severity rubric

| Level | Meaning |
|-------|---------|
| Critical | Direct auth bypass, secret exposure, or PHI IDOR with clear exploit path |
| High | Significant control gap likely to enable account/session/data abuse |
| Medium | Defense-in-depth gap or privacy/abuse vector with constraints |
| Low | Hardening / hygiene |
| Info | Doc drift, checklist, or intentional tradeoff |

---

## Findings

### H1 — Payment gateway persists auth sessions contrary to security doc

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-payment-gateway/src/lib/supabase.ts` (`persistSession: true`, `autoRefreshToken: true`) |
| **Doc claim** | [`docs/security.md`](../security.md): “sessions are not persisted (`persistSession: false`)” |
| **Evidence** | Client creates Supabase with local persistence. Success/Cancel call `signOut()`, but abandoned checkouts, crashes, or shared browsers can leave a live session in storage. Website email/password sign-in on this origin amplifies the risk. |
| **Recommendation** | Set `persistSession: false` (and ideally `autoRefreshToken: false`) for hosted checkout, **or** update the threat model and add explicit idle timeout + storage wipe on unload. Prefer matching the documented non-persistence model. |

### H2 — Community profiles readable by any authenticated user (includes phone)

| | |
|--|--|
| **Severity** | High (privacy / enumeration) |
| **Where** | `supabase/migrations/20260721100000_community_portal_phase1.sql` — policy `"Users read community profiles" … using (true)` on `community_profiles` |
| **Evidence** | Table columns include `full_name`, `phone`, `photo_url`, `bio`, geo FKs, `user_id`. Any logged-in CareMate user (mobile or portal) can `select *` the full directory. |
| **Recommendation** | Restrict SELECT to chapter co-members, self, and staff (or expose a narrowed public view without `phone` / precise location). Align with directory UX needs. |

### M1 — Arbitrary inserts into `community_notifications`

| | |
|--|--|
| **Severity** | Medium |
| **Where** | Same migration — `"System inserts notifications" … with check (true)` |
| **Evidence** | Any authenticated client can insert rows for any `user_id` (phishing/spam via in-app inbox). Mobile `notifications` correctly scopes insert to `user_id = auth.uid()`. |
| **Recommendation** | Restrict insert to `service_role` / staff / chapter leaders, or `with check (user_id = auth.uid())` if only self-sync is needed. |

### M2 — Provider document uploads trust client MIME / extension (no content sniff)

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `caremate-provider-portal/src/domains/documents/actions.ts` (`resolveUploadMime`); storage upload in `documents/repository.ts` uses `input.file.type` |
| **Contrast** | Admin learn media uses `sniffAllowedMediaMime` magic-byte checks (`caremate-admin-portal/src/lib/media-sniff.ts`). |
| **Evidence** | A file with a `.pdf` name and mismatched content can pass extension fallback; content-type stored may be `application/octet-stream`. |
| **Recommendation** | Reuse magic-byte sniffing (at least PDF `%PDF` / image signatures) and set Storage `contentType` from sniffed MIME. Apply the same to payer document uploads. |

### M3 — Edge Functions CORS is `Access-Control-Allow-Origin: *`

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `supabase/functions/_shared/cors.ts` |
| **Evidence** | All Edge JSON responses advertise `*`. Auth still required where implemented, but browser calls from any origin can invoke credentialed flows if a user visits a malicious page while holding a JWT (classic browser CSRF-ish / token-bearing fetch). |
| **Recommendation** | Allowlist `getcaremate.com`, Amplify app hosts, localhost; keep `*` only for truly public webhooks if those are separated. |

### M4 — Community portal missing Content-Security-Policy

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `caremate-community-portal/next.config.ts` — HSTS/XFO/nosniff present; **no CSP** |
| **Contrast** | Admin and provider portals set a baseline CSP. Docs already note nonce CSP as a follow-up. |
| **Recommendation** | Add the same baseline CSP as admin/provider; plan nonce wiring later. |

### M5 — Checkout handoff accepted from query string (Referer / log leakage)

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `caremate-payment-gateway/src/lib/supabase.ts` — `hashParams.get('handoff') ?? queryParams.get('handoff')` |
| **Evidence** | Hash fragment is preferable (not sent in Referer). Query `?handoff=` can appear in proxy logs, analytics, and Referer headers before `history.replaceState` clears it. |
| **Recommendation** | Prefer hash-only in production deep links; reject or immediately invalidate query handoffs after one use (already single-use server-side — keep TTL short; stop emitting query form from mobile/website). |

### M6 — Ingest API default key is a fixed string

| | |
|--|--|
| **Severity** | Medium (ops / misconfig) |
| **Where** | `caremate-provider-ingestion/app/settings.py` — `ingest_api_key: str = "dev-ingest-key"` |
| **Evidence** | Auth compares bearer token to this setting. If production is deployed without overriding `INGEST_API_KEY`, the default is guessable. Endpoints correctly require the key. |
| **Recommendation** | Fail closed when `ENV=production` and key is missing/default; document required secret in ops runbook. |

### L1 — HTTPS return URLs allow any path on allowlisted hosts

| | |
|--|--|
| **Severity** | Low |
| **Where** | `supabase/functions/_shared/return-url.ts` |
| **Doc drift** | `docs/security.md` still says HTTPS paths other than `/success`\|`/cancel` are rejected; code intentionally allows Care Portal billing paths. Nested `return=` is validated only on success/cancel-style paths. |
| **Recommendation** | Update security.md to match; optionally constrain path prefixes (`/success`, `/cancel`, `/billing/*`, `/app/settings/billing`, `/payer/settings/billing`). |

### L2 — Payment gateway return-URL host allowlist is broader than Edge for path rules

| | |
|--|--|
| **Severity** | Low |
| **Where** | `caremate-payment-gateway/src/lib/return-url.ts` — any path on allowlisted host |
| **Recommendation** | Align gateway and Edge validators; keep Amplify hosts as an explicit allowlist (already done — good). |

### L3 — Deploy checklist still unchecked for cutover

| | |
|--|--|
| **Severity** | Low / operational |
| **Where** | `docs/security.md` deploy checklist |
| **Evidence** | Unchecked: `supabase db push` (handoff token nullability), redeploy listed Edge functions, redeploy payment gateway + three portals. OOB OTP items are marked done. |
| **Recommendation** | Confirm prod state and check boxes, or open an ops ticket if still pending. |

### L4 — CSP still allows `'unsafe-inline'` scripts (admin/provider)

| | |
|--|--|
| **Severity** | Low |
| **Where** | Admin/provider `next.config.ts` |
| **Evidence** | Documented follow-up (nonce CSP). Reduces XSS blast radius but does not eliminate inline script XSS. |
| **Recommendation** | Track nonce-based CSP as a hardening epic. |

### I1 — Staff role sourced from `app_metadata.role`

| | |
|--|--|
| **Severity** | Info |
| **Where** | Admin middleware + `requirePortalSession` |
| **Evidence** | Correct if only service role / Auth Admin can set `app_metadata`. Ensure no client-callable path can elevate `app_metadata` (Supabase default is fine). Defense-in-depth: server actions already call `requirePortalSession`. |

---

## Positive controls (verified)

| Control | Status |
|---------|--------|
| Checkout handoff single-use + atomic `used_at` + token clear | OK — `exchange-checkout-handoff` |
| Handoff table revoked from anon/authenticated | OK — service_role only |
| Return URL blocks `javascript:` / `data:` / arbitrary hosts | OK — Edge + payment gateway |
| Family billing IDOR guard `assertHouseholdMembership` | OK — create-checkout / upgrade / store verify |
| Stripe webhook HMAC + 5‑minute timestamp + constant-time compare | OK |
| Paystack webhook HMAC-SHA512 + timing-safe compare | OK |
| Community / provider OTPs emailed OOB; hashes stored; not returned to browser | OK |
| OTP send throttling (`provider_auth_otp_sends` / community join) | OK |
| Softened Patient ID enumeration on community join | OK (dummy verification id + masked email) |
| Admin middleware staff gate + server-action `requirePortalSession` | OK |
| Admin post-login redirect sanitization | OK — `safe-redirect.ts` + tests |
| Admin media MIME sniff + 15 MB cap | OK |
| Provider document size ≤ 3 MB + allowlisted extensions | OK (MIME sniff still M2) |
| Provider upload requires approved patient connection | OK |
| Portal security headers (XFO, nosniff, Referrer-Policy, HSTS, Permissions-Policy) | OK (CSP gap on community — M4) |
| Health-data gateway JWT guard on controllers + user_id ownership checks | OK |
| Provider ingestion Bearer API key on ingest routes | OK (default key — M6) |
| Mobile SQLCipher / SecureStore / handoff model (per docs + structure) | Documented and consistent with Edge |
| No `service_role` in client `NEXT_PUBLIC_` / `VITE_` / `EXPO_PUBLIC_` bundles (static scan) | OK — server-only usage in portals/Edge/ingest |
| Amplify builds write `SUPABASE_SERVICE_ROLE_KEY` into `.env.production` for **server** Next builds (not `NEXT_PUBLIC_`) | OK pattern; keep secrets out of client components |

---

## Suggested remediation order

1. **H1** — Fix payment-gateway session persistence (or formally revise threat model).
2. **H2 / M1** — Tighten community profile + notification RLS.
3. **M2** — Magic-byte sniff on provider/payer uploads.
4. **M3 / M4** — Edge CORS allowlist + community CSP.
5. **M5 / M6** — Hash-only handoff links; fail-closed ingest key in prod.
6. **L3** — Close deploy checklist against production.

---

## Method

- Pulled / verified `origin/main` at audit time.
- Static review of Edge Functions, portals, payment gateway, migrations, ingestion, health gateway, workflows, and security docs.
- Grep-assisted scans for secrets, `service_role`, permissive RLS (`using (true)` / `with check (true)`), OTP return paths, CORS, and CSP.
- No live exploitation against caremate-dev/prod; no secret values were accessed.

---

## Follow-ups

- Optional: automated RLS regression tests (pgTAP / supabase test) for community tables and billing tables.
- Optional: dependency/SCA scan in CI (`npm audit` / OSV) as a scheduled workflow.
- Re-audit after remediating H1–M4.
