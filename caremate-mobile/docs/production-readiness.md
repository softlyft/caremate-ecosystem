# Mobile production readiness

[← Back to index](./README.md) · [Mobile release](./mobile-release.md)

Living checklist for the first App Store / Play submit. Updated **21 Aug 2026**.

**Verdict: not store-submit ready** — release pipelines and much of Phase 1 are in place; remaining work is mostly secrets, association files, branch sync, host cutover, and store paperwork.

---

## Done recently (in-repo)

| Item | Notes |
|------|--------|
| Store deploy gated | `android-play.yml` / `ios-app-store.yml` are **manual only**; push to `prod` runs **CI only** |
| CI on `prod` | `ci.yml` includes `prod` branch |
| iOS build numbers | Shared `resolve-ios-build-number.sh` uses `github.run_id` (+ offset) — no TF/AS collision |
| AdMob fail-closed | Production rejects missing/sample app IDs (`app.config.ts` + `assert-production-mobile-env.sh`) |
| Reject caremate-dev in store builds | Assert fails if Supabase URL contains `eybakmhqtotoywwgwgjy` |
| Main CD Android env parity | Website / payment / community / Sentry / PostHog / gateway injected |
| Sentry upload | Enabled automatically when `SENTRY_AUTH_TOKEN` is set on store jobs |
| Prod applinks strip | Production binaries drop Amplify / `dev.getcaremate.com` hosts |
| Supabase per-env CI | [Supabase Deploy](../../.github/workflows/supabase-migrate.yml): migrations + Edge Functions on `main`→dev, `prod`→prod |
| Pluggable email | `EMAIL_PROVIDER=smtp\|ses\|resend` — [email.md](../../supabase/docs/email.md) |
| Period roadmap accuracy | Calendar fertility documented as partial; learned cycle still deferred |

---

## Open blockers (must close before submit)

### 1. Branch sync

| Check | Status |
|-------|--------|
| `prod` ≈ `main` | **Open** — `prod` is ~**35 commits behind** `main` |
| Timeline / WIP on `bug/fixes` | **Open** — merge to `main` (and then `prod`) or keep timeline out of the first cut |

Do **not** ship the current stale `prod` tip.

### 2. GitHub Environment `production` secrets still missing

Present and useful: Supabase URL/anon, website/payment/community hosts, AdMob live IDs, Sentry DSN, PostHog API key, Android keystore, ASC API key, Apple team id, distribution **certificate** base64.

| Secret | Why |
|--------|-----|
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | iOS archive will fail without it (on **development**, missing on **production**) |
| `IOS_PROVISIONING_PROFILE_BASE64` | Same — App Store profile |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play upload when `upload=true` (on development only today) |
| `SUPABASE_ACCESS_TOKEN` | Supabase Deploy CI for prod migrations/functions |
| `SUPABASE_DB_PASSWORD` | Prod project DB password for `db push` |
| `SENTRY_AUTH_TOKEN` | Optional but needed for readable native stacks (DSN alone is not enough for upload) |
| `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` | Optional; empty → PHI may sync plaintext (assert **warns**) |

Copy signing / Play SA from `development` where appropriate; use **prod** DB password and access token for migrate.

### 3. Universal Links / App Links

| File | Status |
|------|--------|
| `caremate-website/public/.well-known/apple-app-site-association` | Still `TEAMID.com.softlyft.caremate` |
| `caremate-website/public/.well-known/assetlinks.json` | Still `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` |

Replace `TEAMID` with Apple Team ID; after first Play AAB, paste **Play App Signing** SHA-256. Redeploy website. Until then, prefer `caremate://` fallbacks.

### 4. Store compliance / listing

- App Privacy (iOS) + Data Safety (Play), including ads + health data  
- Privacy / Terms live on production website URLs  
- IAP products in App Store Connect / Play Console matching `caremate.premium.*`  
- Screenshots, age rating, health disclaimers  
- Submit for Review (iOS) / complete Play release (draft upload ≠ live)

### 5. Other production hosts

Website is live (`getcaremate.com`). Confirm production secrets for:

- Payment (`payment.getcaremate.com` or current `EXPO_PUBLIC_PAYMENT_URL`)
- Community portal  
- Health data gateway (if claiming encrypted PHI)

Edge Function **runtime** secrets on **prod** Supabase (`EMAIL_PROVIDER`, SMTP/SES/Resend, Stripe/Paystack, etc.) are separate from GitHub — set after `supabase:link:prod`. See [email.md](../../supabase/docs/email.md).

---

## High (should fix for a serious launch)

| Item | Status |
|------|--------|
| Confirm production Supabase migrations applied | Run Supabase Deploy on `prod` once secrets exist; or `supabase:link:prod` + `db push` |
| Deploy Edge Functions to prod | Same workflow / `supabase:functions:deploy:prod` |
| Auth SMTP on prod project | Dashboard Auth → SMTP (same mailbox as product mail for MVP) |
| FCM / APNs google services files | No `google-services.json` / `GoogleService-Info.plist` in app — don’t claim reliable OS push in listing yet |
| Gateway cutover policy | Set URL or disclose plaintext sync |

---

## Medium / defer

| Item | Notes |
|------|--------|
| `EXPO_PUBLIC_POSTHOG_HOST` | Optional if not US Cloud default |
| IAP product ID overrides in CI | Defaults in code; confirm Console SKUs match |
| Period learned cycle / Flo depth | Deferred — fixed user-set cycle + calendar fertility is MVP |
| Social auth, E2E, maps SDK, biometric lock | Post-MVP |

---

## Ship order (ops)

1. Copy **iOS profile + cert password** and **Play SA** onto GitHub Environment **production**  
2. Add **prod** `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD`; run **Supabase Deploy** (or manual link/push + functions)  
3. Set prod Edge secrets (`EMAIL_PROVIDER=smtp` + SMTP, billing keys, etc.)  
4. Fill AASA `TEAMID` + (when available) Play signing SHA; deploy website  
5. Merge `bug/fixes` → `main` → `prod` (or cut without timeline)  
6. Optional: `SENTRY_AUTH_TOKEN`, gateway URL  
7. Complete store listings / privacy forms; run [QA P0](./qa-test-cases.md) on a **production-signed** binary  
8. Manual **iOS App Store** + **Android Play** dispatch from branch `prod`

---

## Related docs

| Topic | Doc |
|-------|-----|
| Branch / CD strategy | [mobile-release.md](./mobile-release.md) |
| Play | [play-android-release.md](./play-android-release.md) |
| App Store | [ios-app-store-release.md](./ios-app-store-release.md) |
| Env vars | [configuration.md](./configuration.md) |
| Email | [supabase/docs/email.md](../../supabase/docs/email.md) |
| Supabase CI | [supabase/docs/operations.md](../../supabase/docs/operations.md) |
| Ads secrets | [ads.md](./ads.md) |
| Roadmap gaps | [roadmap.md](./roadmap.md) |
