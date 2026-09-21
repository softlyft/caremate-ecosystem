# Mobile production readiness

[← Back to index](./README.md) · [Mobile release](./mobile-release.md)

Living checklist for the first App Store / Play submit. Updated **20 Sep 2026**.

**Verdict: almost ready — not store-review ready** — binaries can build/upload (Play + TestFlight green on `prod`); remaining work is website deep links / association files, prod Supabase Deploy health, and Console/IAP/push paperwork.

---

## Done (verified)

| Item | Notes |
|------|--------|
| Branch sync | `origin/prod` **contains** `origin/main` (0 behind as of 20 Sep 2026) |
| Production secrets | iOS cert password + App Store profile, Play SA, Supabase token/DB, Sentry present; Play assert + upload succeeded |
| Store deploy gated | `android-play.yml` / `ios-app-store.yml` **manual only**; push to `prod` runs **CI only** |
| AdMob fail-closed | Production rejects sample IDs (`app.config.ts` + `assert-production-mobile-env.sh`) |
| Reject caremate-dev in store builds | Assert fails if Supabase URL is caremate-dev |
| App icon 1024² | `assets/images/caremate-icon.png` wired as `icon` + `ios.icon` |
| Android SDK CI | `setup-android@v4` with `packages: platform-tools` (no obsolete `tools`) |
| Remember email | Email-only prefill; password never stored; OS autofill enabled |
| Prod applinks strip | Production binaries drop Amplify / `dev.getcaremate.com` hosts |

---

## Open blockers (must close before submit / review)

### 1. Website SPA deep links (legal URLs)

Live probes (20 Sep 2026): `https://www.getcaremate.com/privacy`, `/terms`, `/security`, `/refunds` → **404** (SPA HTML shell). Pages exist in `caremate-website` source.

**Fix:** Amplify Console SPA **200 rewrite** to `/index.html` per [amplify-hosting.md](../../docs/amplify-hosting.md); redeploy; confirm privacy/terms return real content. App uses `LEGAL_URLS` → `{WEBSITE}/privacy|terms`.

### 2. Universal Links / App Links

| File | Status |
|------|--------|
| `caremate-website/public/.well-known/apple-app-site-association` | Still `TEAMID.com.softlyft.caremate`; **live URL 404 HTML** (must serve JSON, no trailing-slash SPA rewrite) |
| `caremate-website/public/.well-known/assetlinks.json` | Still `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` — copy SHA from Play Console (App signing) now that AABs upload |

Until fixed, prefer `caremate://` fallbacks.

### 3. Store compliance / listing (ops)

- App Privacy (iOS) + Data Safety (Play), including ads + health data  
- IAP products in ASC / Play matching `caremate.premium.{personal\|family}.{monthly\|yearly}`  
- Screenshots, age rating, health disclaimers  
- Submit for Review (iOS) / complete Play release (draft upload ≠ live)

### 4. Prod Supabase Deploy health

Recent **Supabase Deploy** on `prod` failed token/project authorization for `aokorersszvediuatagp`. Re-check `SUPABASE_ACCESS_TOKEN` privileges; run Deploy (or `supabase:link:prod` + `db push` + functions) to green.

### 5. Push (if claiming OS notifications)

`google-services.json` in the app ≠ Expo credentials. Upload **FCM V1** service account to Expo + **APNs `.p8`** for iOS. See [notifications.md](./notifications.md#android-expo-push-setup).

### 6. Optional / warn

| Item | Notes |
|------|--------|
| `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` | Empty → PHI may sync plaintext (assert **warns**) |
| `SENTRY_AUTH_TOKEN` | Needed for native source-map upload (DSN alone ≠ upload) |
| Payment host naming | Prefer `payment.getcaremate.com` (live); confirm secret matches |

---

## Medium / defer

| Item | Notes |
|------|--------|
| Period learned cycle / Flo depth | Deferred — fixed cycle + calendar fertility is MVP |
| Social auth, E2E, maps SDK, biometric lock | Post-MVP |
| Manual **iOS App Store** workflow dispatch | TestFlight on `prod` succeeded; still need ASC upload job when listings ready |

---

## Ship order (ops)

1. Amplify SPA rewrite → privacy/terms **200**  
2. AASA real Team ID + non-SPA hosting for `/.well-known/apple-app-site-association`  
3. Play signing SHA → `assetlinks.json`; redeploy website  
4. Fix prod Supabase token; Deploy migrations + functions to green  
5. IAP SKUs + App Privacy / Data Safety + screenshots  
6. Expo FCM V1 + APNs (if push claimed)  
7. QA P0 on production-signed binary  
8. Manual **iOS App Store** + promote **Android Play** from branch `prod` → Submit  

---

## Related docs

| Topic | Doc |
|-------|-----|
| Branch / CD strategy | [mobile-release.md](./mobile-release.md) |
| Play | [play-android-release.md](./play-android-release.md) |
| App Store | [ios-app-store-release.md](./ios-app-store-release.md) |
| Amplify SPA | [amplify-hosting.md](../../docs/amplify-hosting.md) |
| Env vars | [configuration.md](./configuration.md) |
| Email | [supabase/docs/email.md](../../supabase/docs/email.md) |
| Ads secrets | [ads.md](./ads.md) |
