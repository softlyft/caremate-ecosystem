# iOS TestFlight release (dev · GitHub Actions)

[← Back to index](./README.md) · [Mobile release strategy](./mobile-release.md)

Dev TestFlight builds run on **merge to `main`**: prebuild → signed IPA → TestFlight upload. EAS is not used.

Workflow: [`.github/workflows/ios-testflight.yml`](../../.github/workflows/ios-testflight.yml)  
Bundle ID: `com.softlyft.caremate`  
GitHub Environment: **`development`**

Production App Store builds on `prod` are documented in [iOS App Store release](./ios-app-store-release.md).

## Trigger

- **Automatic:** none on Free private — you run deploy manually
- **Manual:** **Actions → Mobile Main CD → Run workflow** on branch **`main`** (after CI is green)
- **iOS only (no APK):** same workflow with **ios_only**, or **Actions → iOS TestFlight**

## What you must provide

Add secrets to GitHub Environment **`development`** (or repo-level secrets). Signing secrets can be shared with prod — see [Mobile release strategy](./mobile-release.md#github-environments).

### Signing (required to build)

| Secret | Value |
|--------|--------|
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Base64 of the `.p12` file |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Password set when exporting the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 of the App Store `.mobileprovision` |
| `APPLE_TEAM_ID` | 10-character Team ID from [developer.apple.com/account](https://developer.apple.com/account) |

See [How to create signing secrets](#how-to-create-signing-secrets) below for step-by-step instructions.

### TestFlight upload (required to publish the IPA)

1. Create the app in [App Store Connect](https://appstoreconnect.apple.com/apps) if it does not exist (`com.softlyft.caremate`, Free).
2. Create an **App Store Connect API key** (Admin or App Manager) under Users and Access → Integrations → API.
3. Download the `.p8` once; note **Key ID** and **Issuer ID**.

| Secret | Value |
|--------|--------|
| `APP_STORE_CONNECT_API_KEY_P8` | Full contents of `AuthKey_XXXXXX.p8` |
| `APP_STORE_CONNECT_KEY_ID` | API key Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | API key Issuer ID |

### App env (recommended for a real TestFlight build)

Same `EXPO_PUBLIC_*` values you want in dev/staging. If unset, the binary still builds (guest-capable) but cloud features will not work.

| Secret | Purpose |
|--------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `EXPO_PUBLIC_WEBSITE_URL` | Legal / universal links |
| `EXPO_PUBLIC_PAYMENT_URL` | Checkout |
| `EXPO_PUBLIC_COMMUNITY_PORTAL_URL` | Community |
| `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` | Optional gateway |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional |
| `EXPO_PUBLIC_POSTHOG_*` | Optional |
| `EXPO_PUBLIC_ADMOB_*` | **Do not set.** `main` TestFlight uses Google sample IDs. Live IDs belong on **`production`** only — see [Ads → GitHub secrets](./ads.md#github-secrets) |

### Optional variable

| Variable | Purpose |
|----------|--------|
| `IOS_BUILD_NUMBER_OFFSET` | Added to `github.run_id` for `CFBundleVersion`. Leave unset/0 unless App Store Connect already has a higher build than recent run IDs. |

You can also pass **build_number** when dispatching the workflow.

## How to create signing secrets

You create these in **Apple Developer**, export them on a **Mac**, then base64-encode for GitHub.

### Prerequisites

- Active [Apple Developer Program](https://developer.apple.com/programs/) membership
- Access to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
- Bundle ID **`com.softlyft.caremate`** registered under **Identifiers**

### `IOS_DISTRIBUTION_CERTIFICATE_BASE64` + `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`

This is your **Apple Distribution** certificate, exported as a `.p12` file (certificate + private key).

#### Create the certificate (if you do not have one)

1. Open [Certificates](https://developer.apple.com/account/resources/certificates/list) → **+**
2. Choose **Apple Distribution** (App Store / TestFlight)
3. On your Mac, open **Keychain Access**
4. **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
5. Enter your email, select **Saved to disk**, save the `.csr` file
6. Upload the CSR in the Apple Developer portal
7. Download the `.cer` file and double-click to install it in Keychain Access

#### Export as `.p12`

1. In **Keychain Access** → **login** → **My Certificates**, find **Apple Distribution: … (TEAM_ID)**
2. Right-click → **Export "Apple Distribution…"**
3. Save as e.g. `CareMate-Distribution.p12`
4. Set a password — this becomes **`IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`**

#### Base64 for GitHub

```bash
base64 -i CareMate-Distribution.p12 | tr -d '\n' | pbcopy
```

Paste into GitHub secret **`IOS_DISTRIBUTION_CERTIFICATE_BASE64`**.

### `IOS_PROVISIONING_PROFILE_BASE64`

This is the **App Store** provisioning profile for `com.softlyft.caremate`.

#### Create the profile

1. Open [Profiles](https://developer.apple.com/account/resources/profiles/list) → **+**
2. Select **App Store Connect** (under Distribution)
3. Choose App ID **`com.softlyft.caremate`**
4. Select your **Apple Distribution** certificate from above
5. Name it e.g. `CareMate App Store`
6. Download the `.mobileprovision` file

The App ID must include the capabilities CareMate uses (see [App ID capabilities](#app-id-capabilities-required) below). If you already created a profile before enabling them, **delete the old profile**, regenerate, and update `IOS_PROVISIONING_PROFILE_BASE64`.

#### Base64 for GitHub

```bash
base64 -i CareMate-AppStore.mobileprovision | tr -d '\n' | pbcopy
```

Paste into GitHub secret **`IOS_PROVISIONING_PROFILE_BASE64`**.

### `APPLE_TEAM_ID`

Find it at [developer.apple.com/account](https://developer.apple.com/account) → **Membership details** → **Team ID** (10 characters).

### App ID capabilities (required)

Before creating the provisioning profile, open [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → **`com.softlyft.caremate`** → **Edit** and enable:

| Capability | Why |
|------------|-----|
| **Associated Domains** | Universal links (`app.json` → `ios.associatedDomains`) |
| **Push Notifications** | `expo-notifications` |

Save the App ID, then **regenerate** the App Store provisioning profile and update **`IOS_PROVISIONING_PROFILE_BASE64`** in GitHub.

For Push Notifications, you do **not** need to upload an APNs key to build or archive — that is only required at runtime for delivery. The capability must still be on the App ID and in the profile.

### Notes

- The **`.p12` export must be done on a Mac** that has the private key in Keychain Access. The portal only provides `.cer`; GitHub CI needs the full key pair in `.p12` form.
- Use profile type **App Store Connect**, not **Development** or **Ad Hoc**.
- If the cert was created on another machine, export the `.p12` from that Mac or create a new distribution cert on yours.
- Store the `.p12`, password, and profile in a password manager — do not commit them to git.

## How to run

Runs via **Mobile Main CD** (recommended) or **iOS TestFlight** manual dispatch:

**GitHub Actions → Mobile Main CD → Run workflow** (branch `main`, after CI passes)

- **upload** — submit to TestFlight after build (default: on)
- **build_number** — override iOS build number (optional)

After upload, open App Store Connect → TestFlight → wait for **Processing** → add the build to an internal testing group. Export compliance is pre-declared (`ITSAppUsesNonExemptEncryption: false`).

**Do not submit `main` TestFlight builds to the App Store** — they contain dev/staging config. Ship from `prod` via [iOS App Store release](./ios-app-store-release.md).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Provisioning profile doesn't include **Associated Domains** / **Push Notifications** | Enable both on the App ID, regenerate the App Store profile, update `IOS_PROVISIONING_PROFILE_BASE64` |
| `No signing certificate "Apple Distribution"` | Re-export `.p12`; confirm cert is not expired |
| Provisioning profile mismatch | Regenerate App Store profile for `com.softlyft.caremate` |
| Upload fails with 401/403 | Check API key role and secret values |
| Build number already used | Increase `IOS_BUILD_NUMBER_OFFSET` or pass **build_number**. Auto builds use `run_id` (unique across TestFlight and App Store). |
| Xcode / ExpoModulesJSI failure | Ensure root `postinstall` applies `patches/expo-modules-jsi+57.0.1.patch` (xcframework output path) and `patches/caremate-mobile++expo-modules-jsi+57.0.4.patch` (`Swift.abs` on Xcode 26.3) |
