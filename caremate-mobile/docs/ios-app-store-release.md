# iOS App Store release (prod · GitHub Actions)

[← Back to index](./README.md) · [Mobile release strategy](./mobile-release.md)

Production iOS builds are **manual** on branch **`prod`**: prebuild → signed IPA → upload to App Store Connect.

Workflow: [`.github/workflows/ios-app-store.yml`](../../.github/workflows/ios-app-store.yml)  
Bundle ID: `com.softlyft.caremate`  
GitHub Environment: **`production`** (git branch is **`prod`**)

Dev TestFlight builds on `main` are documented in [iOS TestFlight release](./ios-testflight-release.md). **Do not** submit a `main` TestFlight build for App Store review — it has `EXPO_PUBLIC_APP_ENV=testflight` and **development** backends baked in.

## TestFlight vs App Store (CareMate)

Apple does not use Play-style tracks (`internal` / `alpha` / `beta` / `production`). One production IPA goes to App Store Connect; you then use **TestFlight** and/or **App Store → Submit for Review** on that same build.

| Lane | CareMate use |
|------|----------------|
| **Dev (`main`)** | Mobile Main CD / iOS TestFlight → TestFlight with **dev** backends. Never App Store review. |
| **Prod (`prod`)** | **iOS App Store** workflow → IPA with **production** env. |
| ASC **TestFlight** (on that prod build) | Optional final QA against prod backends. |
| ASC **App Store** version | Select the build → **Submit for Review** (manual in Console). |

Signing: same Apple Distribution certificate as TestFlight is fine. Use an **App Store** provisioning profile. ASC API keys can be shared; **`EXPO_PUBLIC_*` + live AdMob** must live on GitHub Environment **`production`**.

## Recommended release flow

Dev stays as-is (`main` → TestFlight). To ship iOS:

1. Merge `main` → **`prod`** (CI runs; no App Store Connect upload).
2. **Actions → iOS App Store** (branch **`prod`**) → **upload** on.
3. App Store Connect → wait for **Processing**.
4. Optional: add that build to an **internal TestFlight** group → QA on **production** env.
5. If good → **App Store** tab → create/select version → **select that build** → **Submit for Review**.

Usually **one** prod IPA is enough (no second CI build unless you need a new binary). CI does **not** submit for review — that stays in App Store Connect.

Compared to Android: Play uses **internal track → production draft → Console**; iOS uses **upload once → optional TestFlight QA → Submit for Review**. See [Play Android release](./play-android-release.md#recommended-release-flow).

## Trigger

- **Manual only:** Actions → **iOS App Store** → Run workflow (pick branch **`prod`**)
- Merge / push to **`prod`** runs **CI** only — it does **not** upload to App Store Connect
- **Mobile Main CD** rejects branch `prod` (dev TestFlight / Slack path only)

## Secrets

Uses GitHub Environment **`production`**. Signing secrets are the same as TestFlight — see [How to create signing secrets](./ios-testflight-release.md#how-to-create-signing-secrets).

| Secret | Notes |
|--------|--------|
| `IOS_DISTRIBUTION_CERTIFICATE_*` | Same cert as TestFlight |
| `IOS_PROVISIONING_PROFILE_BASE64` | App Store profile |
| `APPLE_TEAM_ID` | Team ID |
| `APP_STORE_CONNECT_*` | API key for upload |
| `EXPO_PUBLIC_*` | **Production** URLs and keys |
| `EXPO_PUBLIC_ADMOB_*` | Live ads: 2 app IDs + Android banners + `EXPO_PUBLIC_ADMOB_BANNER_UNIT_IOS`. See [Ads → GitHub secrets](./ads.md#github-secrets) |
| `SENTRY_AUTH_TOKEN` | Optional — when set, native source-map upload is enabled automatically |

Store workflows **fail closed** if AdMob app IDs are missing/sample, host/Supabase URLs are missing, or Supabase still points at `caremate-dev`.

### Optional variable (repo or `production` environment)

| Variable | Purpose |
|----------|--------|
| `IOS_BUILD_NUMBER_OFFSET` | Added to `github.run_id` for `CFBundleVersion`. Same formula as TestFlight — `run_id` is unique across workflows, so lanes do not collide. |

## Manual dispatch options

| Input | Default | Purpose |
|-------|---------|--------|
| **upload** | on | Upload to App Store Connect after build |
| **build_number** | auto | Override `CFBundleVersion` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build number already used | Increase `IOS_BUILD_NUMBER_OFFSET` or pass **build_number**. Auto builds use `run_id` (unique across TestFlight and App Store). |
| Wrong backend in build | Check **`production`** environment `EXPO_PUBLIC_*` secrets |
| Cannot submit for review | Complete App Store listing metadata in App Store Connect first |
| Tried to ship `main` TestFlight to App Store | Rebuild with **iOS App Store** on **`prod`** — binaries are not interchangeable |

See also [iOS TestFlight troubleshooting](./ios-testflight-release.md#troubleshooting) for signing and Xcode issues.
