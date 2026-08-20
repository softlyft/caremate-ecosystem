# Mobile release (branch strategy)

[← Back to index](./README.md)

CareMate mobile releases are **branch-driven** and built entirely on **GitHub Actions** (no EAS).

| Branch | What ships | Workflow |
|--------|------------|----------|
| **`main`** | Dev **TestFlight** (iOS) + sideload **APK** artifact (Android) | [Mobile Main CD](../../.github/workflows/mobile-main-cd.yml) — **manual** after CI |
| **`prod`** | **App Store** (iOS) + **Play** (Android) — **manual** dispatch only | [iOS App Store](./ios-app-store-release.md) · [Play Android](./play-android-release.md) |

`EXPO_PUBLIC_*` values are **baked into the binary at build time**. Dev builds on `main` and production builds on `prod` are **different binaries** — you cannot promote a `main` TestFlight build to the App Store.

## Flow

```
feature → PR → main → CI (format · lint · typecheck · test)  ← automatic
                         └── you run Mobile Main CD manually  ← your approval
                               ├── iOS TestFlight (dev backends)
                               └── Android APK artifact (sideload QA)

main → PR → prod → CI only (no store upload)
              └── you run store workflows manually
                    ├── iOS App Store  → App Store Connect
                    └── Android Play   → Play production track
```

## Free plan + private repo

GitHub **Required reviewers** on environments is **not available** on Free plans with private repos. Human approval is **manual workflow dispatch** instead:

1. Merge to `main` → wait for **CI** to pass (automatic)
2. **Actions → Mobile Main CD → Run workflow** (pick branch `main`) → that is your deploy approval

The workflow checks that the **latest CI run on that branch succeeded** before building (unless you check **skip_ci_check** for emergencies).

For **prod** store releases: merge to `prod` runs **CI only**. Deploy with **Actions → iOS App Store** / **Android Play** (pick branch `prod`) when you are ready.

## GitHub Environments

Create two environments under **Settings → Environments**:

| Environment | Used by | Secrets |
|-------------|---------|---------|
| **`development`** | Mobile Main CD on `main` (Android APK + iOS TestFlight) | Dev/staging `EXPO_PUBLIC_*` (AdMob test IDs are hardcoded; live AdMob secrets are not used) |
| **`production`** | `ios-app-store.yml`, `android-play.yml` on git branch `prod` | Production `EXPO_PUBLIC_*` including live `EXPO_PUBLIC_ADMOB_*` |

**Signing secrets** (`IOS_*`, `ANDROID_*`, `APPLE_TEAM_ID`, App Store Connect API key, Play service account) can live at **repo** level or on each environment. On Free private repos, environments mainly **scope secrets** — they do not add approval gates.

### AdMob GitHub secrets

- **`development` / `main`:** do not set AdMob secrets. Test IDs are hardcoded.
- **`production`:** 2 app IDs + one Android banner (all 11 `EXPO_PUBLIC_ADMOB_BANNER_*`) + one iOS banner (`EXPO_PUBLIC_ADMOB_BANNER_UNIT_IOS`).

Full secret names: [Ads → GitHub secrets](./ads.md#github-secrets).

## iOS: TestFlight vs App Store

| | `main` TestFlight | `prod` App Store |
|--|-------------------|------------------|
| Env | `EXPO_PUBLIC_APP_ENV=testflight` | `EXPO_PUBLIC_APP_ENV=production` |
| Backends | Dev/staging (Amplify) | Production |
| Destination | TestFlight internal testers | App Store Connect |
| Store submit | No | Upload in CI; **submit for review** in [App Store Connect](https://appstoreconnect.apple.com) |

On `prod`, you may optionally use the **same uploaded build** for final TestFlight QA, then select it when submitting for App Store review — but it must be the **prod** build, not a `main` build.

## Android: APK vs Play

| | `main` | `prod` |
|--|--------|--------|
| Output | Unsigned/debug-style **APK** artifact | Signed **AAB** |
| Distribution | Download from GitHub Actions artifact | Play **production** track (draft by default) |
| Play Console | Not used | Upload via API |

Play can **promote the same AAB** across tracks in Play Console. `prod` CI uploads directly to the **production** track as a **draft** unless you check **publish_production** on manual dispatch.

## Version numbers

- **iOS** `CFBundleVersion`: `IOS_BUILD_NUMBER_OFFSET` + `github.run_id` (repo-wide unique — TestFlight and App Store cannot collide)
- **Android** `versionCode`: `ANDROID_VERSION_CODE_OFFSET` + `github.run_number`
- **Marketing version** (`1.0.0`): bump `caremate-mobile/app.json` → `expo.version` before release

## Deploy `main` (dev)

1. Merge PR → confirm **CI** is green on `main`
2. **Actions → Mobile Main CD → Run workflow**
   - Branch: **`main`**
   - **ios_only** / **android_only** — optional, build one platform
   - **skip_ci_check** — emergency only
3. Download Android APK from artifacts; iOS appears in TestFlight after processing

## Manual runs (other)

## Related docs

- [iOS TestFlight (dev)](./ios-testflight-release.md)
- [iOS App Store (prod)](./ios-app-store-release.md)
- [Play Android (prod)](./play-android-release.md)
