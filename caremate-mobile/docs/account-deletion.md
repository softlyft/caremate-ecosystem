# Account deletion (mobile)

[← Back to index](./README.md) · [Authentication](./authentication.md) · [Security](./security.md)

What happens when a signed-in patient chooses **Settings → Delete account** and confirms. Use this for QA, support, and privacy reviews.

**Not the same as admin “Disable account”** — see [Admin disable vs mobile delete](#admin-disable-vs-mobile-delete) below.

---

## End-to-end flow

```
Settings → Delete account → confirm
        ↓
Mobile: supabase.functions.invoke('delete-account')  (caller JWT required)
        ↓
Edge function (deidentify):
  1. Best-effort cancel Stripe / Paystack subscriptions
  2. Scrub personal PHI tables (trackers, emergency, keys, devices, …)
  3. Tombstone profiles → full_name "Deleted user", deleted_at set, identity cleared
  4. Disconnect/cancel active patient↔org connections (history retained)
  5. Revoke sessions + auth.admin.deleteUser(id, soft=true)
        ↓
Mobile (after edge success):
  wipeLocalAccountData(userId)
  clearDeviceAccountBinding()
  signOut()  →  guest UI
```

Implementation:

| Layer | Location |
|-------|----------|
| UI | `src/app/(app)/profile/settings.tsx` |
| Auth store | `src/features/auth/store.ts` → `deleteAccount()` |
| Client orchestration | `src/services/auth-service.ts` → `deleteAccount()` |
| Local wipe | `src/domains/auth/wipe-local-account.ts` |
| Edge function | `supabase/functions/delete-account/index.ts` |
| Schema | `profiles.deleted_at` + `service_end_patient_connections_for_account_delete` |

Guests never see Delete account (see [QA ME-16](./qa-test-cases.md)).

---

## Edge function (deidentification)

The `delete-account` function:

1. **Validates** the `Authorization` bearer JWT and resolves the caller’s `auth.users` row.
2. **Best-effort billing cancel** — Stripe / Paystack for `active|trialing|past_due` (failures swallowed).
3. **Scrubs personal PHI** — deletes rows in personal tables (`emergency_profiles`, `mini_app_snapshots`, `health_timeline_events`, `user_encryption_keys`, notifications/devices, bookmarks, settings, community membership/profile, family households owned by the user, etc.).
4. **Tombs the profile** — keeps `profiles.user_id`; sets `full_name = 'Deleted user'`, `deleted_at`, clears email/phone/DOB/`patient_id`/address/national_id/`emergency_share_token`.
5. **Ends org access** — approved connections → `disconnected`; pending → `cancelled` (via service-role RPC). Messaging, appointments, and document **history stay**.
6. **Soft-deletes auth** — `auth.admin.deleteUser(user.id, true)` so the UUID remains (no cascade wipe of interaction rows) and the email can be re-registered. Falls back to hard delete only if soft delete is unavailable.

Returns `{ ok: true, mode: 'deidentified' }` (or `hard_deleted` on fallback).

---

## Cloud data erased (explicit scrub)

| Area | Tables / data |
|------|----------------|
| **Identity surface** | Profile PII fields cleared; `patient_id` cleared |
| **Emergency PHI** | `emergency_profiles` |
| **Health trackers** | `mini_app_snapshots`, `health_timeline_events` |
| **Prefs / learn** | `settings`, `bookmarks`, `article_reads` |
| **Encryption** | `user_encryption_keys` |
| **Notifications / location** | `notifications`, `notification_devices`, `user_location_samples` |
| **Family (owned)** | `family_households` created by user; sent connection requests; linked_user_id / to_user_id cleared |
| **Community** | Memberships, join verifications, community profile |
| **Favorites / checkout** | `provider_favorites`, `checkout_handoffs` |

---

## Cloud data retained (deidentified)

| Kept | How it appears |
|------|----------------|
| **Messaging** | Org↔patient / care-coordination threads remain; Care Portal shows **Deleted user** |
| **Connections** | Rows remain as `disconnected` / `cancelled` |
| **Appointments / docs** | Patient-scoped clinical/org records remain; profile join shows Deleted user |
| **Payments ledger** | `payments` / subscription mirror rows may remain on the soft-deleted user id |
| **Auth UUID** | Soft-deleted `auth.users` row (email freed for a new registration) |

Storage bucket objects are still not systematically deleted (same as before).

---

## Local device wipe (`wipeLocalAccountData`)

After the edge function succeeds, the mobile app clears **this user’s** on-device PHI. Shared offline catalogs are left intact.

### Cleared

| Target | Detail |
|--------|--------|
| **Mini-app state** | In-memory Zustand cleared; user-scoped AsyncStorage keys removed |
| **Emergency lock surface** | Widget / lock snapshot cleared |
| **SQLite user rows** | profiles, emergency, bookmarks, settings, snapshots, entitlements, notifications, location, ads |
| **Family (local)** | Households created by user (+ related members/requests) |
| **Analytics queue** | Rows where `distinct_id` = user |
| **Sync outbox** | Entire `sync_queue` cleared |
| **Device binding** | SecureStore binding removed |
| **Session** | Local sign-out → guest |

Local wipe is **best-effort** if the cloud delete already succeeded.

---

## Admin disable vs mobile delete

| | **Mobile delete account** | **Admin portal disable account** |
|--|---------------------------|----------------------------------|
| **Who** | Patient (self) | Admin / user manager |
| **Mechanism** | Deidentify + soft `deleteUser` | `ban_duration` + `admin_revoke_user_sessions` |
| **Cloud personal PHI** | Scrubbed / tombstoned | **Retained** |
| **Org interaction history** | Retained as Deleted user | Retained with real identity |
| **Sign-in** | Soft-deleted; email free for a **new** account | Blocked while banned |
| **Local app data** | Wiped | Unchanged until session ends |
| **Implementation** | `delete-account` edge | `caremate-admin-portal` → `banUser` |

---

## QA checklist

Use alongside [ME-15 / ME-16](./qa-test-cases.md).

| Step | Expected |
|------|----------|
| Signed-in → Settings → Delete account → confirm | Success; returns to guest |
| Sign in with same email/password | Fails for old account; **new signup with same email** can succeed |
| Supabase `profiles` for old `user_id` | Row present: `full_name = Deleted user`, `deleted_at` set, identity fields null |
| Provider portal: former org thread | Conversation still listed; patient label **Deleted user** |
| Provider portal: connection | Status `disconnected` (or cancelled if was pending) |
| Active Stripe/Paystack sub | Cancelled when keys + provider id present |
| Same device as guest | No local PHI for deleted user |
| Guest Settings | Delete account control hidden |

---

## Related docs

- [Authentication — device binding & delete](./authentication.md#device-account-binding-same-device-reuse)
- [Security — wipe on delete](./security.md#at-rest)
- [Sync inventory](./SYNC_INVENTORY.md)
- [Supabase Edge Functions README](../../supabase/functions/README.md#account-deletion)
