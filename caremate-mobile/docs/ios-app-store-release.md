# iOS App Store release (prod · GitHub Actions)

[← Back to index](./README.md) · [Mobile release strategy](./mobile-release.md)

Production iOS builds run on **merge to `prod`**: prebuild → signed IPA → upload to App Store Connect.

Workflow: [`.github/workflows/ios-app-store.yml`](../../.github/workflows/ios-app-store.yml)  
Bundle ID: `com.softlyft.caremate`  
GitHub Environment: **`production`** (git branch is **`prod`**)

Dev TestFlight builds on `main` are documented in [iOS TestFlight release](./ios-testflight-release.md).

## Trigger

- **Automatic:** push/merge to **`prod`** when `caremate-mobile/**` changes
- **Manual:** Actions → **iOS App Store** → Run workflow (pick `prod` branch)

## After CI uploads

1. App Store Connect → **TestFlight** → wait for **Processing**
2. Optional: add to an internal group for final prod QA on the **same build**
3. App Store Connect → **App Store** tab → create/select version → select the build → **Submit for Review**

CI uploads the binary; **App Store review submission** is done in App Store Connect (not automated yet).

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

Do **not** reuse dev/staging `EXPO_PUBLIC_*` from the `development` environment.

### Optional variable (repo or `production` environment)

| Variable | Purpose |
|----------|--------|
| `IOS_BUILD_NUMBER_OFFSET` | Added to `github.run_number`. Shared with TestFlight — build numbers must monotonically increase across all iOS uploads. |

## Manual dispatch options

| Input | Default | Purpose |
|-------|---------|--------|
| **upload** | on | Upload to App Store Connect after build |
| **build_number** | auto | Override `CFBundleVersion` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build number already used | Increase `IOS_BUILD_NUMBER_OFFSET` |
| Wrong backend in build | Check **`production`** environment `EXPO_PUBLIC_*` secrets |
| Cannot submit for review | Complete App Store listing metadata in App Store Connect first |

See also [iOS TestFlight troubleshooting](./ios-testflight-release.md#troubleshooting) for signing and Xcode issues.
