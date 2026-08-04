# Authentication

[← Back to index](./README.md)

## Overview

CareMate uses **Supabase Auth** for email/password authentication. The auth layer is designed around **guest-first access** — users are not forced to sign in before using the app.

Implementation spans:
- `src/services/auth-service.ts` — Supabase API calls
- `src/features/auth/store.ts` — Zustand auth state
- `src/lib/storage.ts` — Secure token persistence
- `src/constants/guest.ts` — Guest user constants

---

## Auth store (`useAuthStore`)

| State field | Type | Description |
|-------------|------|-------------|
| `user` | `User \| null` | Current user object |
| `isAuthenticated` | `boolean` | Has valid Supabase session |
| `isGuest` | `boolean` | Using guest mode (default true) |
| `isLoading` | `boolean` | Auth operation in progress |
| `isInitialized` | `boolean` | Bootstrap auth check complete |
| `passwordRecoveryPending` | `boolean` | Recovery deep-link session is active |

### Actions

| Action | Behavior |
|--------|----------|
| `initialize()` | Called on app boot. Clears any legacy biometric preference, restores session from SecureStore → Supabase `getSession()`. Falls back to guest. |
| `signIn(email, password)` | Supabase password auth + local account bootstrap |
| `signUp(email, password, fullName, phone)` | Creates Supabase user. If email confirmation is required, returns `{ needsEmailVerification: true }` and stays guest until OTP verify |
| `verifySignupEmail(email, token, profile?)` | Verifies signup OTP (`verifyOtp` type `signup`), then bootstraps local account |
| `resendSignupEmail(email)` | Resends signup confirmation email |
| `verifyRecoveryEmail(email, token)` | Verifies recovery OTP (`verifyOtp` type `recovery`), then marks password recovery pending |
| `resendRecoveryEmail(email)` | Resends the password-reset email (same as requesting reset again) |
| `signOut()` | Clears push for this device, clears in-memory mini-app state, clears session → guest. **Does not** wipe SQLite / persisted local data (same email can return). |
| `deleteAccount()` | Cloud delete + wipe local account data + clear device account binding |
| `markPasswordRecovery()` | Flags the recovery state after deep-link processing |
| `clearPasswordRecovery()` | Clears recovery mode |
| `updatePassword(password)` | Completes password reset from the recovery flow |
| `syncSessionFromSupabase()` | Refreshes Zustand auth state from Supabase session |

---

## Guest mode

```typescript
// src/constants/guest.ts
export const GUEST_USER_ID = 'guest';
```

- Default state on first launch
- `useCurrentUserId()` returns `GUEST_USER_ID` when `isGuest === true`
- Repositories write local data scoped to `guest` user ID
- Profile tab shows "Guest User" and sign-in prompts

Guest users can:
- Browse Home, articles, providers
- Create local emergency profile (not synced until account created)

Guest users **cannot** use mini-apps (Medication, Checkup, Immunization, Pregnancy, Period) — a patient account is required. See [Premium & plans](./premium-and-plans.md).

---

## Session persistence

| Platform | Token storage |
|----------|---------------|
| iOS / Android | `expo-secure-store` via `authStorage` in `lib/storage.ts` |
| Web | AsyncStorage fallback |

Supabase client (`lib/supabase.ts`) is configured to use this storage adapter.

---

## Sign-up / sign-in local bootstrap

On successful `signUpWithEmail` **with a session** (confirmations off), or after `verifySignupEmailOtp` / `signInWithEmail`, the auth service:

1. **Migrates guest local data** — copies/merges guest-scoped emergency profile, bookmarks, article reads, settings, profile fields, and family ownership onto the account (`migrateGuestLocalData`)
2. **Bootstraps local account rows** (`bootstrapLocalAccountRecords`) so the app does not wait on sync pull:
   - **Profile** — created or filled from auth identity (name, email, phone)
   - **Settings / device defaults** — sign-up always applies onboarding device defaults; sign-in only fills missing country/language/settings
   - **Emergency profile** — created (or name filled) when missing
3. **Hydrates Premium entitlements** (`hydrateAccountEntitlements`) — pulls family membership + `subscriptions` into SQLite so a **new device** shows the correct plan (and AdMob suppression) without waiting on the background sync cycle

Both local stub steps are best-effort so a local DB hiccup does not fail auth. Session restore in `AppProviders` also re-runs entitlement hydrate and invalidates Premium/ads queries, then triggers a full sync.

After bootstrap succeeds, **`bindDeviceAccount`** stores `{ email, userId }` in SecureStore (`STORAGE_KEYS.deviceAccountBinding`) so sign-out can keep local data for that email.

---

## Device account binding (same-device reuse)

CareMate keeps **one primary account email per device** for local PHI continuity:

| Event | Behavior |
|-------|----------|
| Sign-in / sign-up / session restore | Bind device to that account email + userId |
| Sign-out | Clear session + push + in-memory mini-apps; **keep** SQLite rows and user-scoped AsyncStorage |
| Same email signs back in | No wipe — emergency profile and other local data remain |
| Different email tries sign-in / sign-up | Alert with masked previous email; **Proceed** wipes previous local account then continues; **Cancel** aborts |
| Account delete | Wipe local data + clear device binding |

Login and register call `confirmDeviceAccountForAuth` before talking to Supabase. Recovery OTP (`verify-reset`) uses the same gate.

---

## Auth screens

### Login (`(auth)/login.tsx`)
- Email + password form (React Hook Form + Zod)
- Forgot password link
- Continue as guest
- If Supabase env is missing, the screen surfaces configuration messaging rather than a demo sign-in path

### Register (`(auth)/register.tsx`)
- First name, last name, phone, email, password
- Creates account via `signUp`
- When email confirmations are enabled (default in local `supabase/config.toml`), signup returns no session → navigates to verify-email with the address and profile params

### Verify email (`(auth)/verify-email.tsx`)
- User enters the 6-digit OTP from the confirmation email (`{{ .Token }}` in the template)
- Calls `verifySignupEmail` → `supabase.auth.verifyOtp({ type: 'signup' })` → local bootstrap → post-signup setup
- Resend uses `resendSignupEmail` with a short cooldown
- Unconfirmed sign-in attempts on login offer a shortcut to this screen

**Supabase email confirmation setup:**
1. Auth → Providers → Email → enable **Confirm email**
2. Auth → Email Templates → Confirm signup: include `{{ .Token }}` (6-digit code). Local template: `supabase/templates/confirmation.html`
3. Hosted projects must mirror this in the Dashboard; `config.toml` only applies to local Supabase

### Forgot password (`(auth)/forgot-password.tsx`)
- Collects email and calls `authService.resetPassword` (`supabase.auth.resetPasswordForEmail`)
- Navigates to verify-reset so the user can enter the 6-digit code from email (same pattern as signup OTP)
- Deep-link `redirectTo` remains as a fallback for older email templates / Universal Links

### Verify reset code (`(auth)/verify-reset.tsx`)
- User enters the 6-digit OTP from the recovery email (`{{ .Token }}` in the template)
- Calls `verifyRecoveryEmail` → `supabase.auth.verifyOtp({ type: 'recovery' })` → sets `passwordRecoveryPending`
- Then navigates to `auth/reset-password` to choose a new password
- Resend uses `resendRecoveryEmail` (same as requesting reset again) with a short cooldown

### Reset password (`auth/reset-password.tsx`)
- Primary path: after successful recovery OTP verification
- Secondary path: email deep link via `AuthDeepLinkHandler` (`exchangeCodeForSession` or hash tokens)
- User sets a new password with `authService.updatePassword`
- After success, user continues into the app signed in

**Supabase email recovery setup:**
1. Auth → Email Templates → Reset password: include `{{ .Token }}` (6-digit code). Local template: `supabase/templates/recovery.html`
2. Hosted projects must mirror this in the Dashboard; `config.toml` only applies to local Supabase
3. Optional: keep redirect URLs allowlisted if you still support deep-link recovery as a fallback

### Onboarding (`(auth)/onboarding/*`)

The onboarding experience is now a multi-step flow and is part of first-run entry when onboarding is incomplete.

Implemented steps:

- Intro
- Priorities
- Region
- Location
- Notifications
- Next / wrap-up

The app then routes into post-auth setup screens under `/(app)/setup/*` as needed.

---

## Security considerations

- Never log passwords or tokens
- Never store tokens in AsyncStorage on native
- Anon key in `.env` is public by design (Supabase RLS protects data)
- Row Level Security policies must exist on Supabase tables for production

---

## Planned auth methods (not implemented)

- Phone OTP
- Google Sign-In
- Apple Sign-In

---

## Related docs

- [Data Layer](./data-layer.md) — how user_id scopes local data
- [Core Features — Profile](./features.md#profile-me-tab)
- [Configuration](./configuration.md) — Supabase env vars
