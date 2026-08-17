# Mobile release (branch strategy)

[← Back to index](./README.md)

CareMate mobile releases are **branch-driven** and built entirely on **GitHub Actions** (no EAS).

| Branch | What ships | Workflow |
|--------|------------|----------|
| **`main`** | Dev **TestFlight** (iOS) + sideload **APK** artifact (Android) | [iOS TestFlight](./ios-testflight-release.md) · [Mobile CD](../../.github/workflows/mobile-cd.yml) |
| **`prod`** | **App Store** (iOS) + **Play production** track (Android) | [iOS App Store](./ios-app-store-release.md) · [Play Android](./play-android-release.md) |

`EXPO_PUBLIC_*` values are **baked into the binary at build time**. Dev builds on `main` and production builds on `prod` are **different binaries** — you cannot promote a `main` TestFlight build to the App Store.

## Flow

```
feature → PR → main
                 ├── iOS TestFlight (dev backends)     → internal QA
                 └── Android APK artifact              → sideload QA

main → PR → prod
              ├── iOS App Store build (prod backends)  → App Store Connect
              └── Android Play AAB (prod backends)     → Play production track
```

## GitHub Environments

Create two environments under **Settings → Environments**:

| Environment | Used by | Secrets |
|-------------|---------|---------|
| **`development`** | `ios-testflight.yml` on `main` | Dev/staging `EXPO_PUBLIC_*` |
| **`prod`** | `ios-app-store.yml`, `android-play.yml` on `prod` | Production `EXPO_PUBLIC_*` |

**Signing secrets** (`IOS_*`, `ANDROID_*`, `APPLE_TEAM_ID`, App Store Connect API key, Play service account) can live at **repo** level or be duplicated on both environments.

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

- **iOS** `CFBundleVersion`: `IOS_BUILD_NUMBER_OFFSET` + `github.run_number` (shared sequence — must always increase in App Store Connect)
- **Android** `versionCode`: `ANDROID_VERSION_CODE_OFFSET` + `github.run_number`
- **Marketing version** (`1.0.0`): bump `caremate-mobile/app.json` → `expo.version` before release

## Manual runs

All store workflows also support **workflow_dispatch** for hotfixes or re-runs without a merge.

## Related docs

- [iOS TestFlight (dev)](./ios-testflight-release.md)
- [iOS App Store (prod)](./ios-app-store-release.md)
- [Play Android (prod)](./play-android-release.md)
