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

### Actions

| Action | Behavior |
|--------|----------|
| `initialize()` | Called on app boot. Restores session from SecureStore → Supabase `getSession()`. Falls back to guest. |
| `signIn(email, password)` | Supabase password auth |
| `signUp(email, password, fullName)` | Creates Supabase user + local profile, emergency profile, settings |
| `signOut()` | Clears session → returns to guest |
| `signInDemo()` | Local demo user when Supabase unavailable |
| `setBiometricEnabled(enabled)` | Persists preference |

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

## Demo mode

When `isSupabaseConfigured === false` (no `.env` credentials), login screen offers **demo sign-in** which:
- Sets a local demo user without network
- Seeds sample profile and emergency data
- Useful for development and demos

---

## Session persistence

| Platform | Token storage |
|----------|---------------|
| iOS / Android | `expo-secure-store` via `authStorage` in `lib/storage.ts` |
| Web | AsyncStorage fallback |

Supabase client (`lib/supabase.ts`) is configured to use this storage adapter.

---

## Biometric unlock

Uses `expo-local-authentication`:
- `authService.enableBiometrics()` — checks hardware + enrollment, sets flag
- `authService.authenticateWithBiometrics()` — shows system prompt ("Unlock CareMate")
- Preference stored in SecureStore (`STORAGE_KEYS.BIOMETRIC_ENABLED`)

Biometrics gate session **unlock** on the device; they do not replace Supabase authentication.

---

## Sign-up side effects

On successful `signUp`, the auth store also creates local SQLite records:
1. **Profile** — `profileRepository.save()`
2. **Emergency profile** — empty template via `emergencyRepository.save()`
3. **Settings** — default theme/notifications via `profileRepository.saveSettings()`

This ensures offline data exists immediately after registration.

---

## Auth screens

### Login (`(auth)/login.tsx`)
- Email + password form (React Hook Form + Zod)
- Forgot password link
- Demo sign-in button (when Supabase unconfigured)
- Continue as guest

### Register (`(auth)/register.tsx`)
- Name, email, password
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

### Onboarding (`(auth)/onboarding.tsx`)
- 3 slides explaining offline emergency profile, articles, providers
- "Get Started" → navigates to login
- **Not currently shown on first app launch**

---

## Security considerations

- Never log passwords or tokens
- Never store tokens in AsyncStorage on native
- Anon key in `.env` is public by design (Supabase RLS protects data)
- Row Level Security policies must exist on Supabase tables for production

---

## Planned auth methods (not implemented)

From `CareMate.md`:
- Phone OTP
- Google Sign-In
- Apple Sign-In

---

## Related docs

- [Data Layer](./data-layer.md) — how user_id scopes local data
- [Core Features — Profile](./features.md#profile-me-tab)
- [Configuration](./configuration.md) — Supabase env vars
