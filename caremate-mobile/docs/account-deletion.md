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
Edge function:
  1. Best-effort cancel Stripe / Paystack subscriptions (active | trialing | past_due)
  2. auth.admin.deleteUser(user.id)  →  Postgres ON DELETE CASCADE
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

Guests never see Delete account (see [QA ME-16](./qa-test-cases.md)).

---

## Edge function (explicit server actions)

The `delete-account` function does **not** iterate tables or delete storage objects. It only:

1. **Validates** the `Authorization` bearer JWT and resolves the caller’s `auth.users` row.
2. **Best-effort billing cancel** — reads `subscriptions` for the user where `status` ∈ `{ active, trialing, past_due }` and:
   - **Stripe:** `DELETE /v1/subscriptions/{provider_subscription_id}`
   - **Paystack:** `POST /subscription/disable`  
   Provider failures are swallowed; deletion still proceeds.
3. **Deletes the auth user** — `auth.admin.deleteUser(user.id)` with the service role.

All other cloud cleanup is **PostgreSQL cascade** from `auth.users`.

---

## Cloud data removed (cascade from `auth.users`)

Any table with `references auth.users (id) on delete cascade` loses rows keyed to the deleted user. For a typical **patient** account, that includes:

| Area | Tables / data |
|------|----------------|
| **Profile & prefs** | `profiles`, `settings`, `emergency_profiles` |
| **Learn engagement** | `bookmarks`, `article_reads` |
| **Health trackers** | `mini_app_snapshots`, `health_timeline_events` |
| **Billing mirror** | `subscriptions`, `payments` rows tied to `user_id` |
| **Family (owned)** | `family_households` where `created_by_user_id` = user (cascaded members and household-scoped requests); connection requests **sent** by the user |
| **Connections** | `patient_provider_connections`, `patient_payer_connections`, `patient_provider_consents` |
| **Provider engagement** | Patient-scoped `provider_documents`, `provider_appointments`, lab orders, etc. |
| **Payer engagement** | Patient-scoped `payer_documents` and payer org↔patient threads |
| **Messaging** | Org↔patient conversations where `patient_user_id` = user (messages cascade with conversation); care-coordination threads tied to the patient; the user’s `message_participants` rows; `message_direct_pairs` involving the user |
| **Notifications** | `notifications`, `notification_devices` |
| **Location** | `user_location_samples` |
| **Favorites** | `provider_favorites` |
| **Encryption** | `health_data_encryption_keys` (gateway DEK row) |
| **Community** | Community membership and user-scoped portal rows |
| **Checkout** | `checkout_handoffs` |
| **Emergency audit** | `emergency_share_access_logs` where user is viewer or patient |
| **Org staff roles** | If the user was portal staff: `provider_org_members`, `payer_org_members` |

### Partial cleanup (`ON DELETE SET NULL`)

Some references only **clear the user id**, not the parent row:

| Column | Effect |
|--------|--------|
| `family_members.linked_user_id` | Spouse/adult link removed; household child rows may remain |
| `family_connection_requests.to_user_id` | Incoming request target nulled |
| `message_messages.sender_user_id` | Message body may remain in threads that survive |
| Document / audit `uploaded_by`, `actor_user_id`, etc. | Attribution nulled; org or system rows may remain |

---

## Cloud data **not** removed

| Kept | Why |
|------|-----|
| **Shared catalogs** | `articles`, `health_tips`, provider directory catalog, ad catalog tables |
| **Organizations** | `provider_organizations`, `payer_organizations` and org-owned data |
| **Other users’ data** | Other patients, staff accounts, unrelated conversations |
| **Storage bucket objects** | Edge function does not delete files; lifecycle depends on bucket policies / separate jobs |
| **Admin audit log** | Events may remain with nulled `actor_user_id` |

---

## Local device wipe (`wipeLocalAccountData`)

After the edge function succeeds, the mobile app clears **this user’s** on-device PHI. Shared offline catalogs are left intact.

### Cleared

| Target | Detail |
|--------|--------|
| **Mini-app state** | In-memory Zustand cleared; user-scoped AsyncStorage keys removed (`caremate-…:{userId}`) |
| **Emergency lock surface** | Widget / lock snapshot cleared (`syncEmergencyLockSurface(null)`) |
| **SQLite user rows** | `profiles`, `emergency_profiles`, `bookmarks`, `article_reads`, `settings`, `mini_app_snapshots`, `subscription_entitlements`, `notifications`, `user_location_samples`, `ad_events` |
| **Family (local)** | Households created by user (+ members and requests in those households); member links and requests involving the user |
| **Analytics queue** | Rows where `distinct_id` = user |
| **Sync outbox** | **Entire** `sync_queue` table cleared (prevents deleted-user payloads from re-firing) |
| **Device binding** | SecureStore `{ email, userId }` removed |
| **Session** | Local sign-out → guest |

### Kept on device

| Target | Why |
|--------|------|
| `articles`, provider catalog cache, health tips, ads config | Shared read-only catalogs; not user-owned |
| Guest-scoped data | Unaffected unless the deleted user was the only signed-in account on a fresh install |

Local wipe is **best-effort** if the cloud delete already succeeded (errors are swallowed so the user still lands on guest).

---

## Admin disable vs mobile delete

| | **Mobile delete account** | **Admin portal disable account** |
|--|---------------------------|----------------------------------|
| **Who** | Patient (self) | Admin / user manager |
| **Mechanism** | `delete-account` edge → `auth.admin.deleteUser` | `ban_duration: '876000h'` + `admin_revoke_user_sessions` |
| **Cloud data** | Removed via cascade | **Not deleted** — rows remain |
| **Sign-in** | Credentials invalid permanently | Blocked while banned; unban restores access |
| **Local app data** | Wiped on device | Unchanged on device; user kicked to guest on session refresh |
| **Implementation** | `caremate-mobile` + `supabase/functions/delete-account` | `caremate-admin-portal/src/domains/users/actions.ts` → `banUser` |

---

## QA checklist

Use alongside [ME-15 / ME-16](./qa-test-cases.md).

| Step | Expected |
|------|----------|
| Signed-in → Settings → Delete account → confirm | Success; returns to guest |
| Sign in with same email/password | Fails (user gone) or requires new registration |
| Supabase `profiles` for old `user_id` | Row absent |
| Supabase `subscriptions` for old `user_id` | Row absent; Stripe/Paystack sub cancelled when keys + `provider_subscription_id` present |
| Provider portal: former patient connection | Connection row gone; patient no longer in connected list |
| Messaging: org thread with deleted patient | Conversation + messages gone for that patient thread |
| Same device: re-open app as guest | No profile/emergency/mini-app data for deleted user in UI |
| SQLite `sync_queue` | Empty (or no rows for deleted user’s pending ops) |
| Guest Settings | Delete account control hidden |
| Offline delete attempt | Should fail gracefully (requires configured backend + network for edge invoke) |

---

## Related docs

- [Authentication — device binding & delete](./authentication.md#device-account-binding-same-device-reuse)
- [Security — wipe on delete](./security.md#at-rest)
- [Sync inventory](./SYNC_INVENTORY.md) — what sync would have pushed (queue is cleared on delete)
- [Supabase Edge Functions README](../../supabase/functions/README.md#account-deletion)
