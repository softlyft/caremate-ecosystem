# Security

[← Back to index](./README.md)

This document describes CareMate mobile’s **security layer**: what we protect, where it lives, and the controls shipped after the July 2026 hardening pass. For product auth UX, see [Authentication](./authentication.md). For SQLite/sync details, see [Data Layer](./data-layer.md).

---

## Threat models we design for

| Threat | Primary controls |
|--------|------------------|
| Stolen / resold / rooted device reading local PHI | SQLCipher at rest + wipe on account switch / delete |
| Shared device (family tablet): account A → account B leakage | Device account binding + confirm-before-reset when email differs; user-scoped mini-app storage |
| Session theft via browser URL / deep link | Checkout handoff codes; allowlisted auth callback paths |
| Password-reset link opened by someone else | `passwordRecoveryPending` gates app routes until password update |
| PII enumeration via family “find user” | Masked lookup RPC + rate limit |
| Client secrets in the bundle | No service-role keys; only `EXPO_PUBLIC_*` |

Out of scope for the mobile app alone: server RLS correctness (owned by Supabase migrations), App Store / Play Data Safety forms, and Universal Links domain verification (still preferred for auth callbacks; custom scheme remains).

---

## At rest

### SQLite (core health data)

| Item | Detail |
|------|--------|
| File | `caremate.secure.db` |
| Cipher | **SQLCipher** via `expo-sqlite` plugin `useSQLCipher: true` |
| Key | 32-byte raw key, hex, in SecureStore / Keychain / Keystore (`caremate_sqlite_cipher_key_v1`, this-device-only) |
| Apply | `PRAGMA key = "x'…'"` **before** any other SQL (`src/database/encryption-key.ts`, `src/database/client.ts`) |
| Platforms | iOS + Android after a **native rebuild**. Not supported in Expo Go. Web stays unencrypted. |
| Legacy | Plaintext `caremate.db` is deleted on first secure boot; signed-in users rehydrate via sync |
| Backups | Android backup / data-extraction rules exclude `caremate.secure.db` (+ WAL/SHM) |

Wipe on account switch / delete clears user rows (shared-device isolation). Sign-out keeps local rows for the device-bound email so the same user can return without re-entering essentials.

### Session tokens

| Platform | Storage |
|----------|---------|
| iOS / Android | `expo-secure-store` via `authStorage` (`src/lib/storage.ts`) |
| Web | AsyncStorage fallback |

Never put refresh tokens in plain AsyncStorage on native.

### Mini-app Zustand blobs

Persisted under **user-scoped** AsyncStorage keys (`caremate-…:{userId}` / `:guest`) so one account cannot adopt another’s medications / period / pregnancy state. Cleared on account switch / delete (not on sign-out for the same device-bound email).

### Emergency lock surface

Lock/home widgets are retired (always cleared). Emergency share is via opaque Patient ID QR + authenticated RPC (`get_emergency_by_share_token`). Snapshot cleared on account switch / delete (`syncEmergencyLockSurface(null)`).

---

## In transit / session handoff

### Checkout

Mobile does **not** put `access_token` / `refresh_token` in the payment URL.

1. Authenticated invoke `create-checkout-handoff` (stores tokens server-side, TTL ~5 minutes)
2. Opens payment app with `#handoff={code}`
3. Gateway calls `exchange-checkout-handoff` once and receives tokens over HTTPS body

See `supabase/functions/create-checkout-handoff`, `exchange-checkout-handoff`, and `caremate-payment-gateway` `hydrateSessionFromHash`.

### Auth deep links

`handleAuthCallbackUrl` only accepts credentials on allowlisted paths (`auth/reset-password`, `auth/callback`, billing return paths) and known schemes (`caremate`, Expo dev, https). Arbitrary `caremate://…#access_token=…` paths are rejected.

Password recovery: while `passwordRecoveryPending` is true, `/` and `(app)` redirect to `/auth/reset-password` until `updatePassword` succeeds.

Prefer verified **Universal Links / App Links** on `getcaremate.com` / `dev.getcaremate.com`
(`/auth/*`, `/emergency/share/*`, `/billing/*`). Custom scheme `caremate://` remains as fallback
(Expo Go, unverified installs). Host association files live on the marketing site
(`.well-known/apple-app-site-association`, `.well-known/assetlinks.json`) — replace `TEAMID`
and the Play signing SHA-256 before store launch.

---

## Identity & local isolation

| Control | Behavior |
|---------|----------|
| Guest → account migrate | Only in `prepareLocalAccount` (explicit sign-in / sign-up), **not** on every sync cycle |
| Device account binding | SecureStore `{ email, userId }` after auth; gates a different email behind reset confirm |
| Sign-out | Clear push token for **this device**, clear in-memory mini-apps, then Supabase sign-out — **keep** SQLite + persisted mini-app keys for the bound email |
| Account switch (different email) | User confirms → `wipeLocalAccountData` + clear binding, then auth continues |
| Account delete | Same wipe + clear binding + server `delete-account` (JWT-validated) |
| Guest push | No Expo token upload |
| Sync push | Skipped while guest |
| Family lookup | Masked name / email / phone; no DOB; ≤30 lookups / hour / caller |

---

## App lock & passwords

| Control | Detail |
|---------|--------|
| App biometric lock | Removed — no Settings toggle / gate (OS-level device lock still applies) |
| Password minimum | Client Zod ≥ 8 characters (align Supabase Auth `password_min_length`) |

---

## Push devices

Registered Expo tokens are stored locally so sign-out deletes **only this device’s** `notification_devices` row (no “delete all devices for user” fallback).

---

## Native config notes

| Area | Practice |
|------|----------|
| Android cleartext | Debug only; release ATS / no cleartext |
| Permissions | Release strips `SYSTEM_ALERT_WINDOW` via `plugins/withRemoveSystemAlertWindow.js` (debug overlays keep it). Avoid legacy storage unless required |
| iOS ATS | Arbitrary loads disabled in release Info.plist |
| Rebuild | After changing `useSQLCipher`, run `npx expo prebuild` + `expo run:ios` / `run:android` (or EAS). Confirm `android/gradle.properties` and `ios/Podfile.properties.json` contain `expo.sqlite.useSQLCipher=true`. |

---

## Code map

| Concern | Location |
|---------|----------|
| SQLCipher open + key | `src/database/client.ts`, `src/database/encryption-key.ts` |
| Session storage | `src/lib/storage.ts`, `src/lib/supabase.ts` |
| Sign-out / device bind / wipe | `src/features/auth/store.ts`, `src/domains/auth/device-account-binding.ts`, `src/domains/auth/wipe-local-account.ts` |
| Mini-app scoped storage | `src/mini-apps/_kit/synced-storage.ts` |
| Guest migrate | `src/domains/auth/migrate-guest-data.ts` (call site: auth prepare only) |
| Deep links | `src/lib/auth-deep-link.ts`, `src/components/AuthDeepLinkHandler.tsx` |
| Recovery gate | `src/app/index.tsx`, `src/app/(app)/_layout.tsx` |
| Checkout handoff | `src/domains/billing/repository.ts` + Edge Functions above |
| Push registration | `src/domains/notifications/push.ts` |
| Family lookup mask | Supabase migration `*_family_lookup_mask_rate_limit.sql` |

---

## Related

- [Authentication](./authentication.md)
- [Data Layer](./data-layer.md) — SQLCipher client details
- [Configuration](./configuration.md) — env / Edge secrets
- [Notifications](./notifications.md) — push token rules
- Supabase Edge Functions README — `EXPO_ACCESS_TOKEN`, SES, checkout handoff
