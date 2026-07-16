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
| `biometricEnabled` | `boolean` | User opted into biometric unlock |
| `passwordRecoveryPending` | `boolean` | Recovery deep-link session is active |

### Actions

| Action | Behavior |
|--------|----------|
| `initialize()` | Called on app boot. Restores session from SecureStore → Supabase `getSession()`. Falls back to guest. |
| `signIn(email, password)` | Supabase password auth + local account bootstrap |
| `signUp(email, password, fullName, phone)` | Creates Supabase user + local profile + emergency profile |
| `signOut()` | Clears session → returns to guest |
| `setBiometricEnabled(enabled)` | Persists preference |
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
- Use all mini-apps
- Create local emergency profile (not synced until account created)

---

## Session persistence

| Platform | Token storage |
|----------|---------------|
| iOS / Android | `expo-secure-store` via `authStorage` in `lib/storage.ts` |
| Web | AsyncStorage fallback |

Supabase client (`lib/supabase.ts`) is configured to use this storage adapter.

---

## Biometric unlock

`authService` still exposes biometric helpers (`authenticateWithBiometrics`, preference get/set) for a future app-lock flow. The Me-tab toggle is **hidden** until biometrics actually gate launch / sensitive surfaces — the preference alone must not imply security.

---

## Sign-up / sign-in local bootstrap

On successful `signUpWithEmail` or `signInWithEmail`, the auth service:

1. **Migrates guest local data** — copies/merges guest-scoped emergency profile, bookmarks, settings, profile fields, and family ownership onto the account (`migrateGuestLocalData`)
2. **Bootstraps local account rows** (`bootstrapLocalAccountRecords`) so the app does not wait on sync pull:
   - **Profile** — created or filled from auth identity (name, email, phone)
   - **Settings / device defaults** — sign-up always applies onboarding device defaults; sign-in only fills missing country/language/settings
   - **Emergency profile** — created (or name filled) when missing

Both steps are best-effort so a local DB hiccup does not fail auth. Sync pull can still enrich local rows afterward. Mini-app AsyncStorage continues to migrate into account snapshots via `migrateMiniAppsToSnapshots` on sync.

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

### Forgot password (`(auth)/forgot-password.tsx`)
- Collects email and calls `authService.resetPassword` (`supabase.auth.resetPasswordForEmail`)
- `redirectTo` is `Linking.createURL('auth/reset-password')` (e.g. `caremate://auth/reset-password` in release builds)
- Success message is intentionally generic (does not reveal whether the email exists)

### Reset password (`auth/reset-password.tsx`)
- Opened from the email deep link via `AuthDeepLinkHandler`
- Establishes a recovery session (`exchangeCodeForSession` or hash tokens), then user sets a new password with `authService.updatePassword`
- After success, user continues into the app signed in

**Supabase Dashboard setup (required):**
1. Auth → URL Configuration → add the exact redirect URI from the forgot-password screen (DEV shows it) or `caremate://auth/reset-password`
2. Ensure the Site URL / additional redirect URLs allow that scheme
3. Customize the “Reset password” email template if desired; the link must use Supabase’s redirect to the app URI

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
