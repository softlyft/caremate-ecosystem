# Android Play release (GitHub Actions, no EAS)

[← Back to index](./README.md)

Play Store Android builds are produced on GitHub Actions: prebuild → signed AAB → upload. EAS is not used for Android.

Workflow: [`.github/workflows/android-play.yml`](../../.github/workflows/android-play.yml)  
Package: `com.softlyft.caremate`

Sideload APKs (`npm run mobile:apk` / Mobile CD) stay on the debug keystore. Testers must install from Play.

## What you must provide

Add these as **GitHub Actions secrets** on the repo (Settings → Secrets and variables → Actions).

### Signing (required to build)

Create a Play **upload** keystore once. Store the `.jks` / `.keystore` and passwords in a password manager. Do not commit them.

```bash
keytool -genkeypair -v -storetype JKS \
  -keystore caremate-upload.keystore \
  -alias caremate-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then:

```bash
base64 -i caremate-upload.keystore | tr -d '\n' | pbcopy   # macOS; paste into the secret
```

| Secret | Value |
|--------|--------|
| `ANDROID_KEYSTORE_BASE64` | Base64 of the upload keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Alias (e.g. `caremate-upload`) |
| `ANDROID_KEY_PASSWORD` | Key password (often same as store password) |

Avoid `#`, `$`, and newlines in keystore passwords (they break `gradle.properties`).

In Play Console, enroll **Play App Signing** and upload this key as the **upload key** (or let Google generate the app signing key and register this as the upload key). Keep this key; losing it blocks updates until Google resets it.

### Play upload (required to publish the AAB)

1. Create the app in Play Console (`com.softlyft.caremate`, Free) if it does not exist.
2. Google Cloud → enable **Google Play Android Developer API**.
3. Create a **service account**, download the JSON key.
4. Play Console → Users and permissions → invite that service account email with permission to **release to testing tracks** (and later production).

| Secret | Value |
|--------|--------|
| `PLAY_SERVICE_ACCOUNT_JSON` | Full service-account JSON (raw text) |

### App env (recommended for a real Play build)

Same `EXPO_PUBLIC_*` values you want in production. If unset, the binary still builds (guest-capable) but cloud features will not work.

| Secret | Purpose |
|--------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `EXPO_PUBLIC_WEBSITE_URL` | Legal / App Links host |
| `EXPO_PUBLIC_PAYMENT_URL` | Checkout |
| `EXPO_PUBLIC_COMMUNITY_PORTAL_URL` | Community |
| `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` | Optional gateway |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional |
| `EXPO_PUBLIC_POSTHOG_API_KEY` / `EXPO_PUBLIC_POSTHOG_HOST` | Optional |
| `EXPO_PUBLIC_ADMOB_*` | Optional production AdMob IDs |

### Optional variable

| Variable | Purpose |
|----------|--------|
| `ANDROID_VERSION_CODE_OFFSET` | Added to `github.run_number`. Set this if Play already has a higher `versionCode`. |

You can also pass **version_code** when dispatching the workflow.

## How to run

1. Actions → **Android Play** → Run workflow.
2. Track: **internal** for the first testers. Closed testing is **alpha**; open testing is **beta**.
3. Leave **upload** on once Play API secrets are in place. Turn it off to only attach the AAB artifact.
4. **production** uploads as a **draft** unless you check **publish_production**.

If the Play API rejects the first upload (listing still incomplete), download the AAB artifact from the run and upload it once in Play Console, then retry the API on later runs.

`versionName` comes from `app.json` (`1.0.0`). `versionCode` must increase on every Play upload.

After the first accepted AAB, copy **App signing key certificate SHA-256** from Play Console → App signing into `caremate-website/public/.well-known/assetlinks.json`.
