# CareMate main-branch security audit

**Date:** 2026-09-30  
**Scope:** `origin/main` at `cbf0610d` (post PR #169 prod-readiness / #163 Fix security)  
**Surfaces:** Edge Functions, payment gateway, Next portals, Supabase RLS, provider ingestion, health-data gateway, mobile controls (docs + critical paths), CI/CD  
**Out of scope:** Live cloud IAM / Amplify Console config, App Store disclosures, runtime penetration testing against prod

This audit verifies that controls described in [`docs/security.md`](../security.md) and [`caremate-mobile/docs/security.md`](../../caremate-mobile/docs/security.md) are present in code, and looks for residual gaps after the recent hardening pass.

---

## Executive summary

Post-hardening controls for checkout handoff, return-URL allowlisting, Stripe/Paystack webhook signatures, OOB OTPs, admin RBAC, and portal upload size limits are **largely implemented and match the threat model**. Mobile has a strong *design* (SQLCipher, SecureStore sessions, gateway encryption, handoff), but several documented controls are incomplete or fail open. Community profile/notification RLS was already tightened in `20260904130000_security_hardening_batch.sql`.

**Two Critical** production-cutover gaps were confirmed on mobile PHI sync and provider ingestion. Additional **High** issues cover payment-gateway session persistence, **query-string checkout handoffs emitted by Care/Community portals**, community login open redirect, SQLCipher/SecureStore/backup doc-vs-code gaps, plaintext mini-app AsyncStorage, and health-data gateway document ACL / JWT binding / public API exposure.

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

### H2 — Community portal open redirect via unsanitized `next`

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-community-portal/src/features/auth/login-form.tsx` (`router.replace(next \|\| '/app/dashboard')`) |
| **Evidence** | Post-login uses raw `searchParams.get('next')`. Admin/provider sanitize with `sanitizePostLoginPath`; community does not. `?next=https://evil.example` or `//evil.example` can send an authenticated user off-site. |
| **Recommendation** | Allowlist relative `/app…` paths only (same pattern as provider); reject `//`, `://`, `..`; apply on client and any server redirects. |

### H2-fixed — Community profiles / notification insert (already remediated)

| | |
|--|--|
| **Severity** | ~~High / Medium~~ → **Fixed** in `20260904130000_security_hardening_batch.sql` |
| **Evidence** | Profile SELECT now limited to self / staff / `shares_community_chapter_with`; `"System inserts notifications"` dropped and INSERT revoked from `authenticated`/`anon`. |
| **Note** | Earlier phase-1 `using (true)` / `with check (true)` policies must not be treated as current prod risk if this migration is applied. Confirm on hosted projects (see **L3**). |

### M1 — Community Patient ID join still enumerable

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `caremate-community-portal/src/domains/join/actions.ts` |
| **Evidence** | Unknown IDs return sentinel `verificationId: '00000000-…'` and `maskedEmail: 'yo**@email.com'`. Valid IDs return a real UUID + real mask. SES failures throw only on the valid path. Response shape still leaks existence. |
| **Recommendation** | Always return a random UUID-shaped id + generic mask; send email only for real rows; avoid existence-differentiated errors/timing. |

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

### M5 — Checkout handoff emitted and accepted in query string (Referer / log leakage)

| | |
|--|--|
| **Severity** | **High** (elevated — portals actively emit query form) |
| **Where** | `caremate-provider-portal/src/lib/payment-url.ts`, `caremate-community-portal/src/lib/payment-url.ts` (`query.set('handoff', …)`); gateway `supabase.ts` accepts hash **or** query; `exchange-checkout-handoff` is public anon |
| **Doc claim** | Browser opens `#handoff=` only |
| **Evidence** | Query values hit CDN/access logs, history, and Referer before `replaceState`. Exchange returns `access_token` + `refresh_token`. Atomic single-use claim limits reuse but not first interception. |
| **Recommendation** | Emit `#handoff=` only from portals; stop accepting query handoffs (short deprecation OK). Keep atomic claim. |

### M5a — Paystack webhooks lack timestamp / replay window

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `supabase/functions/billing-webhook-paystack/index.ts` (contrast Stripe `maxAgeSeconds = 300`) |
| **Evidence** | HMAC-SHA512 + timing-safe compare present; no event-age check. Captured payloads remain indefinitely replayable (finalize mostly idempotent, so impact limited). |
| **Recommendation** | Reject events older than ~5 minutes using Paystack event timestamp; retain idempotent finalize. |

### M5b — Payment gateway missing browser security headers

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `caremate-payment-gateway/` — no Vite/Amplify header plugin; docs only cover Next portals |
| **Evidence** | Checkout UI can be iframed (clickjacking / UI redress on Paystack CTA and sign-in). |
| **Recommendation** | Amplify `customHttp.yml` (or equivalent): XFO DENY, nosniff, Referrer-Policy, baseline CSP, HSTS. |

### M5c — `finalizeSuccessfulPayment` update not CAS on pending; amount not enforced

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `supabase/functions/_shared/billing.ts` (~L65–110) |
| **Evidence** | Early return if already `succeeded`, but status→succeeded update is `.eq('id')` only (not `.eq('status','pending')`). Concurrent finalizers can both proceed into subscription create/extend. Webhook `amountMinor` overwrites ledger without comparing to initialized amount. |
| **Recommendation** | Claim with `.eq('status','pending')` + require updated row; reject/alert if provider amount ≠ expected `amount_minor`. |

### M5d — Legacy `verify-checkout` recovery weakly binds payer identity

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `supabase/functions/verify-checkout/index.ts` (~L295–350) |
| **Evidence** | If no payments row and `reference` is provided, recovery verifies Paystack and creates payment for the **caller**. `metadata.user_id` enforced only when present. Unique `(provider, provider_reference)` blocks steal when a row exists; orphaned legacy charges / races still matter. |
| **Recommendation** | Require `metadata.user_id === auth.uid()`; refuse recovery when metadata user is missing. |

### M6 — Ingest API default key is a fixed string

| | |
|--|--|
| **Severity** | Medium (ops / misconfig) |
| **Where** | `caremate-provider-ingestion/app/settings.py` — `ingest_api_key: str = "dev-ingest-key"` |
| **Evidence** | Auth compares bearer token to this setting. If production is deployed without overriding `INGEST_API_KEY`, the default is guessable. Endpoints correctly require the key. See also **C2**. |
| **Recommendation** | Fail closed when `ENV=production` and key is missing/default; document required secret in ops runbook. |

### M7 — Provider claim contact emails readable by any authenticated user

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `provider_locations.email` + `"Authenticated read provider_locations" … using (true)` (`20260715140000_provider_fhir_resources.sql`) |
| **Evidence** | Claim contact emails live on location rows readable by any logged-in client. Payer side was narrowed via `payer_directory` (`20260825173000_payer_directory_hide_claim_email.sql`); providers were not. Enables harvesting for phishing / targeted claim attempts (OTP still required). |
| **Recommendation** | Directory view without `email` (mirror payer); expose claim email only via service-role claim RPCs. |

### M8 — `community_join_verifications` lacks table REVOKE

| | |
|--|--|
| **Severity** | Medium (defense-in-depth) |
| **Where** | `20260721113000_community_join_patient_verification.sql` |
| **Evidence** | RLS enabled with no policies (deny-by-default under RLS). Sibling OTP tables (`provider_org_claims`, `provider_password_resets`, `provider_auth_otp_sends`) also `REVOKE ALL FROM anon, authenticated`. |
| **Recommendation** | `REVOKE ALL` from `anon`/`authenticated`; grant to `service_role` only (same for `retired_patient_ids` if applicable). |

### L1 — HTTPS return URLs allow any path on allowlisted hosts

| | |
|--|--|
| **Severity** | Low |
| **Where** | `supabase/functions/_shared/return-url.ts` |
| **Doc drift** | `docs/security.md` still says HTTPS paths other than `/success`\|`/cancel` are rejected; code intentionally allows Care Portal billing paths. Nested `return=` is validated only on success/cancel-style paths. Gateway allows any path and does not recurse nested returns. |
| **Recommendation** | Update security.md to match; optionally constrain path prefixes (`/success`, `/cancel`, `/billing/*`, `/app/settings/billing`, `/payer/settings/billing`). Align gateway with Edge. |

### L1a — `caremate://` allowlist is prefix-based

| | |
|--|--|
| **Severity** | Low |
| **Where** | Edge + gateway `return-url.ts` |
| **Evidence** | `startsWith('caremate://billing/success')` also accepts `…/success.extra` / unusual suffixes depending on mobile handlers. |
| **Recommendation** | Parse path strictly (`billing/success` \| `billing/cancel` + optional query). |

### L1b — `create-checkout-handoff` does not verify refresh_token ownership

| | |
|--|--|
| **Severity** | Low |
| **Where** | `supabase/functions/create-checkout-handoff/index.ts` |
| **Evidence** | Access token validated via `getUser()`; body `refresh_token` stored as-is. |
| **Recommendation** | Validate/refresh server-side and persist only a session pair for `user.id`. |

### L1c — `notify-family-email` `removed` without household binding

| | |
|--|--|
| **Severity** | Low |
| **Where** | `supabase/functions/notify-family-email/index.ts` |
| **Evidence** | With `householdId`, ownership is checked; without it, a household owner can notify an arbitrary `removedUserId` (spam via push). |
| **Recommendation** | Require `householdId` and verify target membership. |

### L1d — Service-role auth helpers inconsistent (mail/cron)

| | |
|--|--|
| **Severity** | Low |
| **Where** | OTP senders use `isServiceRoleRequest`; `send-billing-email` / `billing-renewal-reminders` exact-match `SUPABASE_SERVICE_ROLE_KEY` |
| **Recommendation** | Route all through `isServiceRoleRequest`; prefer constant-time compare. |

### L2 — Payment gateway return-URL host allowlist is broader than Edge for path rules

| | |
|--|--|
| **Severity** | Low |
| **Where** | `caremate-payment-gateway/src/lib/return-url.ts` — any path on allowlisted host |
| **Recommendation** | Align gateway and Edge validators; keep Amplify hosts as an explicit allowlist (already done — good). |

### L2a — Success page may navigate before `signOut` completes

| | |
|--|--|
| **Severity** | Low (worsens **H1**) |
| **Where** | `caremate-payment-gateway/src/pages/SuccessPage.tsx` — `openAppDeepLink` then `void signOut()` |
| **Recommendation** | `await signOut()` before redirect when using persisted sessions; or disable persistence (**H1**). |

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

## Findings — mobile, health gateway & ingestion

Verified follow-up from deeper mobile / gateway / ingest review (cross-checked in tree).

### C1 — PHI sync falls back to plaintext Supabase when gateway URL is unset

| | |
|--|--|
| **Severity** | Critical (production cutover) |
| **Where** | `caremate-mobile/src/domains/health-data-gateway/client.ts`, emergency/mini-app repositories, `caremate-mobile/scripts/assert-production-mobile-env.sh` |
| **Evidence** | `gatewayRequest` returns `null` when URL unset; callers (e.g. `emergency/repository.ts` `syncToRemote`) then upsert full PHI to Supabase. Production assert only **warns** on empty `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` (`warn=1`), does not fail the build. |
| **Recommendation** | Fail closed for store/`APP_ENV=production` builds: require gateway URL; remove or hard-disable plaintext cloud write paths in production binaries. |

### C2 — Provider ingest: default API key + unbounded uploads + prod service-role target

| | |
|--|--|
| **Severity** | Critical (if reachable) |
| **Where** | `caremate-provider-ingestion/app/settings.py`, `app/main.py`, `app/auth.py`, `app/writers/supabase.py` |
| **Evidence** | Default `ingest_api_key="dev-ingest-key"`; `UploadFile.read()` with no max size; `?env=prod` selects prod service-role credentials; simple string compare for auth. |
| **Recommendation** | Fail closed if key is default/empty outside local; enforce size/MIME limits; separate prod keys; rate-limit; keep service behind private network (not public Amplify/internet). (Overlaps portal finding **M6**.) |

### MH1 — SQLCipher can silently degrade to plaintext

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-mobile/src/database/client.ts` — `applyEncryptionKey` / `openNativeDatabase` |
| **Evidence** | Missing `PRAGMA cipher_version` returns `false`, but `openNativeDatabase` discards that result and continues opening the DB. |
| **Recommendation** | Abort init (hard fail) when native encryption is expected but cipher is unavailable; add regression tests. |

### MH2 — Documented Android backup exclusion not implemented

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-mobile/docs/security.md` vs `app.json` / `app.config.ts` / `plugins/*` |
| **Evidence** | Docs claim backup/data-extraction rules exclude `caremate.secure.db`; no `fullBackupContent` / `dataExtractionRules` / `allowBackup=false` config found. |
| **Recommendation** | Add Expo config plugin excluding DB/WAL/SHM; consider `allowBackup=false` for release. |

### MH3 — SecureStore “this-device-only” not applied

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-mobile/src/lib/storage.ts`, `encryption-key.ts`; docs in `security.md` / `data-layer.md` |
| **Evidence** | `secureSetItem` never passes `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` (constant only appears in tests). Auth + SQLCipher keys use default accessibility. |
| **Recommendation** | Pass `WHEN_UNLOCKED_THIS_DEVICE_ONLY` for auth session + cipher keys on iOS/Android. |

### MH4 — Mini-app PHI also in plaintext AsyncStorage

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-mobile/src/mini-apps/_kit/synced-storage.ts`, `hydrate.ts` |
| **Evidence** | User-scoped Zustand persist writes clinical payloads to AsyncStorage outside SQLCipher (medications / period / pregnancy state). |
| **Recommendation** | Prefer SQLite-only for PHI, or encrypt AsyncStorage blobs with the Keystore key. |

### MH5 — Gateway org document list without per-patient consent; `file_url` cleartext

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-health-data-gateway/libs/documents/src/documents.service.ts`, `DOCUMENT_PHI_FIELDS` |
| **Evidence** | `listForOrganization` only checks org membership. Encryption covers `title` / `file_name` only — `file_url` stored and returned plaintext. |
| **Recommendation** | Enforce connection + consent (or patient ACL) on list/get; treat `file_url` as sensitive (encrypt or short-lived signed URLs). |

### MH6 — Health gateway HTTP API lacks network authZ controls

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-health-data-gateway/template.yaml`, Nest bootstrap; JWT only at app layer |
| **Evidence** | SAM `HttpApi` `ANY /{proxy+}` with no API Gateway auth/throttle; service-role backend bypasses RLS once JWT accepted. |
| **Recommendation** | API Gateway throttling + WAF; CORS allowlist; request size limits; consider private API / IP allowlist for staff routes. |

### MH7 — JWT verify lacks issuer/audience binding

| | |
|--|--|
| **Severity** | High |
| **Where** | `caremate-health-data-gateway/libs/common/src/auth/supabase-jwt.guard.ts` |
| **Evidence** | `jwtVerify` sets algorithms only — no `issuer` / `audience` checks. |
| **Recommendation** | Require `iss` = `{SUPABASE_URL}/auth/v1` and expected `aud`; reject non-access tokens. |

### MM1 — Universal/App Links not launch-ready

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `caremate-website/public/.well-known/apple-app-site-association` |
| **Evidence** | Placeholder `TEAMID.com.softlyft.caremate` still present. |
| **Recommendation** | Replace Team ID; serve AASA as application/json without SPA rewrite. |

### MM2 — Ingest `/health` discloses env configuration

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `caremate-provider-ingestion/app/main.py` |
| **Evidence** | Unauthenticated health returns `supabase_configured_dev` / `_prod` style flags. |
| **Recommendation** | Public `{status:"ok"}` only; detail behind auth. |

### MM3 — Gateway CD secrets via CloudFormation parameters + long-lived IAM keys

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `.github/workflows/gateway-cd.yml`, `template.yaml` |
| **Evidence** | Service role / JWT / master key as SAM parameter overrides; IAM user access keys (OIDC noted as future). |
| **Recommendation** | SSM/Secrets Manager + OIDC for AWS auth. |

### MM4 — CI workflow missing explicit `permissions`

| | |
|--|--|
| **Severity** | Medium |
| **Where** | `.github/workflows/ci.yml` |
| **Evidence** | Deploy workflows set `contents: read`; CI does not. |
| **Recommendation** | Add top-level least-privilege `permissions`. |

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
| Softened Patient ID enumeration on community join | Partial — sentinel shape still leaks existence (**M1**) |
| Admin middleware staff gate + server-action `requirePortalSession` | OK |
| Admin post-login redirect sanitization | OK — `safe-redirect.ts` + tests (community missing — **H2**) |
| Community profile / badge / certificate SELECT scoped to chapter peers | OK — `20260904130000_security_hardening_batch.sql` |
| Community notification client INSERT revoked | OK — same hardening batch |
| Admin media MIME sniff + 15 MB cap | OK |
| Provider document size ≤ 3 MB + allowlisted extensions | OK (MIME sniff still M2) |
| Provider upload requires approved patient connection | OK |
| Portal security headers (XFO, nosniff, Referrer-Policy, HSTS, Permissions-Policy) | OK (CSP gap on community — M4) |
| Health-data gateway JWT guard on controllers + owner checks (profile/emergency/timeline) | OK (JWT claims / docs ACL — MH5–MH7) |
| Provider ingestion Bearer API key on ingest routes | OK (default key / size — C2) |
| Mobile: SecureStore for auth on native; guest sync skipped; device account binding / wipe | OK (accessibility / backup — MH2–MH3) |
| Mobile: SQLCipher intended (`useSQLCipher: true`); legacy plaintext DB deleted on secure boot | OK if cipher present (fail-open — MH1) |
| Gateway field-level encryption architecture (wrapped DEKs + master key) | OK for fields in PHI lists |
| No `service_role` in client `NEXT_PUBLIC_` / `VITE_` / `EXPO_PUBLIC_` bundles (static scan) | OK — server-only usage in portals/Edge/ingest |
| Amplify builds write `SUPABASE_SERVICE_ROLE_KEY` into `.env.production` for **server** Next builds (not `NEXT_PUBLIC_`) | OK pattern; keep secrets out of client components |
| CD workflows: GitHub Environments + `permissions: contents: read` on deploy jobs | OK |

---

## Suggested remediation order

1. **C1** — Fail closed on missing health-data gateway URL in production store builds; block plaintext PHI cloud writes.
2. **C2 / M6** — Harden provider ingestion (prod key, size limits, network isolation).
3. **MH1–MH3** — Hard-fail without SQLCipher; Android backup exclusion; SecureStore this-device-only.
4. **MH4–MH7** — Encrypt or relocate mini-app PHI; tighten gateway document ACL + JWT iss/aud + API Gateway controls.
5. **H1 / H2 / M5** — Payment-gateway session persistence; sanitize community login `next`; hash-only handoff (stop portal `?handoff=`).
6. **M1 / M5a–M5d / M7 / M8** — Join enumeration; Paystack replay window; payment-gateway headers; finalize CAS/amount; verify-checkout identity; claim emails; join REVOKE.
7. **M2–M4 / MM\*** — MIME sniff, Edge CORS, community CSP, AASA, CI permissions.
8. **L3** — Close `docs/security.md` deploy checklist against production (includes confirming hardening-batch migration applied).

---

## Method

- Pulled / verified `origin/main` at audit time.
- Static review of Edge Functions, portals, payment gateway, migrations, ingestion, health gateway, mobile, workflows, and security docs.
- Grep-assisted scans for secrets, `service_role`, permissive RLS (`using (true)` / `with check (true)`), OTP return paths, CORS, CSP, SQLCipher/SecureStore, and gateway cutover.
- Cross-checked with deeper passes: [Audit Edge & billing security](bc-19564e37-deba-51ac-83f7-534748bdbfc1), [Audit portals & RLS](bc-4c04f7c9-6a7f-522f-bb1e-a3f64fdf60d1), [Audit mobile & ingestion](bc-92087905-6f74-50e0-bcd8-dd01ce6c1e3c).
- No live exploitation against caremate-dev/prod; no secret values were accessed.

---

## Follow-ups

- Optional: automated RLS regression tests (pgTAP / supabase test) for community tables and billing tables.
- Optional: dependency/SCA scan in CI (`npm audit` / OSV) as a scheduled workflow.
- Re-audit after remediating **C1–C2**, **H1–H2**, **M5**, and **MH1–MH3** at minimum.
