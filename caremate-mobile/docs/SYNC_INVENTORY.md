# Sync inventory (mobile ↔ Supabase)

[← Back to Sync Engine](./SYNC_ENGINE.md) · [Data Layer](./data-layer.md)

Authoritative list of what the **sync engine** pushes and pulls, plus data that uses **direct Supabase RPC/API** instead. Use this when validating rows in Supabase or debugging “missing on server / missing on device”.

Manual sync: **Settings → Sync now** runs a full cycle (retry failed queue rows → push → pull). The top-of-screen sync toast was removed in favor of this control.

---

## How a sync cycle works

```
Settings → Sync now  |  startup  |  foreground  |  reconnect  |  hourly interval  |  daily background
        ↓
retryFailedSyncOperations()   (resets attempts on exhausted queue rows)
        ↓
pushPendingChanges()          (drain sync_queue → handler.push)
        ↓
pullRemoteChanges()           (each registered handler.pull)
        ↓
rehydrate mini-app Zustand stores (signed-in, no pending mini-app queue rows)
        ↓
sync_metadata.last_sync_at updated
```

**Also on every online cycle (not Supabase):** `analytics_queue` → PostHog flush.

**Requires signed-in user for push:** Guests can pull catalogs (articles, tips, ads) but most `sync_queue` pushes no-op or skip when `isGuest`.

**Health Data Gateway:** When `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` is set, PHI for profiles, emergency, mini-app snapshots, family member fields, health timeline, and messages may route through the gateway (encrypted envelopes). If gateway is configured but unreachable, affected pushes **stay in the queue** rather than falling back to plaintext. See [Sync Engine — gateway note](./SYNC_ENGINE.md).

---

## Push (device → Supabase)

Queued in SQLite `sync_queue` on local writes. Operations: `create` | `update` | `delete`.

| `entity_type` | Supabase table(s) | When enqueued | Push behavior | DB validation hints |
|---------------|-------------------|---------------|---------------|---------------------|
| `profiles` | `profiles` | Profile save (name, contact, country, patient ID fields, practitioner flag, …) | Upsert by `id`; delete by `id`. Gateway preferred. Never overwrites remote `patient_id` / `emergency_share_token` with null. | Row where `user_id = auth.uid()`; check `updated_at` matches device save time. |
| `settings` | `settings` | Theme / notification prefs / subscribed article categories | Upsert or delete by `id` | `user_id`, `theme`, `notifications_enabled`, `subscribed_category_ids`. |
| `emergency_profiles` | `emergency_profiles` | Emergency card save | Upsert (one row per `user_id`; reuses remote PK if exists). Gateway preferred. Delete by `id`. | `user_id` unique; JSON arrays for allergies/meds/conditions/contacts. |
| `providers` | `providers` (stub RPC), `provider_favorites` | Favorite toggle / unfavorite | `ensure_provider_catalog_stub` then upsert or delete `provider_favorites` for `(user_id, provider_id)`. Signed-in only. | Favorites: `provider_favorites.is_favorite = true`. Stub row in `providers` if missing. |
| `user_location_samples` | `user_location_samples` | Location capture (Nearby / geo features) | Upsert sample row; delete on op delete. Signed-in only. Pruned locally to limit. | `user_id`, `latitude`, `longitude`, `captured_at`, `source`. |
| `bookmarks` | `bookmarks` | Learn bookmark toggle | Upsert or delete by `id` | `(user_id, article_id)` via row `id`. |
| `article_reads` | `article_reads` | Mark reading / read / clear read state | Upsert or delete by `id` | `status` ∈ `reading` \| `read`, `opened_at`, `read_at`. |
| `mini_app_snapshots` | `mini_app_snapshots` | Mini-app Zustand persist (meds, vitals, pregnancy, …) | Upsert `{ user_id, app_key, payload }` or delete. **Guests never enqueue.** Gateway encrypts clinical leaves in `payload`. | One row per `(user_id, app_key)`; keys: `vitals`, `medication`, `checkup`, `immunization`, `pregnancy`, `period`. |
| `health_timeline_events` | `health_timeline_events` | Timeline projection from mini-apps | Upsert event row or delete. Gateway preferred for PHI in `payload`. | `user_id`, `app_key`, `kind`, `occurred_on`, `title`, `summary`. |
| `family_households` | `family_households` | Household create/update | Upsert or delete | `created_by_user_id`, `name`. |
| `family_members` | `family_members` | Add/edit child or linked adult | Upsert or delete. DOB/gender/notes via gateway when configured. | `household_id`, `kind`, `linked_user_id`, `full_name`. |
| `family_connection_requests` | `family_connection_requests` | Spouse invite flow (local mirror of RPC-created rows) | Upsert or delete | `from_user_id`, `to_user_id`, `status`, `household_id`. |
| `notifications` | `notifications` | In-app notification read/dismiss sync | Upsert or delete. **Guests skip push.** | `user_id`, `domain`, `event_type`, `dedupe_key`, `read_at`. |
| `ad_events` | `ad_events` | Ad impression/click telemetry | Upsert event row | Device → cloud only; not pulled back. |

### Registered handlers with **no push**

| `entity_type` | Reason |
|---------------|--------|
| `articles` | Read-only catalog on device |
| `health_tips` | Portal-managed catalog |
| `subscriptions` | Server-owned (Paystack / webhooks) |
| `ad_catalog` | Portal-managed ad config |

---

## Pull (Supabase → device)

Every handler runs on each full sync cycle (when online). Failures are isolated per handler.

| Handler / `entity_type` | Supabase source | Local SQLite table | Notes |
|-------------------------|-----------------|-------------------|--------|
| `profiles` | `profiles` (or gateway) | `profiles` | Skips plaintext pull if gateway configured but gateway fetch fails. Merge rules protect display name. |
| `settings` | `settings` | `settings` | |
| `emergency_profiles` | `emergency_profiles` (or gateway) | `emergency_profiles` | Skips rows with pending local push (pending sync wins). |
| `providers` | `provider_favorites` + `providers` | `providers` | **Favorites only** — not full national catalog. Clears bundled demo rows. |
| `user_location_samples` | `user_location_samples` | `user_location_samples` | Signed-in user's samples. |
| `articles` | `articles` | `articles` | Published catalog + external news; hard-deletes stale external news locally. Also: `AppProviders` / Home / Learn call `pullFromRemote` directly. |
| `health_tips` | `health_tips` | `health_tips` | Active tips only in reads. |
| `bookmarks` | `bookmarks` | `bookmarks` | |
| `article_reads` | `article_reads` | `article_reads` | |
| `mini_app_snapshots` | `mini_app_snapshots` (or gateway) | `mini_app_snapshots` | Does not overwrite local snapshot if local `updated_at` is newer or row is pending push. |
| `health_timeline_events` | `health_timeline_events` (or gateway) | `health_timeline_events` | |
| `family_*` (3 handlers) | `family_households`, `family_members`, `family_connection_requests` | same names | Scoped to households the user owns or belongs to; requests where user is from/to. |
| `subscriptions` | `subscriptions` | `subscription_entitlements` | **Full replace** of local entitlement cache. Offline pull skipped. |
| `notifications` | `notifications` | `notifications` | Filtered by `user_id`. Guests: local-only, no pull. |
| `ad_catalog` | `ad_remote_config`, `ad_advertisers`, `ad_campaigns`, `ad_creatives`, `ad_placements` | matching `ad_*` tables | Pull-only catalog. |

---

## Not in the sync engine (direct / realtime)

These features talk to Supabase **immediately** when online (RPC, insert, or Realtime). They do **not** wait for the hourly sync cycle.

| Feature | Mechanism | Supabase tables / RPCs | Local cache |
|---------|-----------|------------------------|-------------|
| **Messaging** | Realtime + direct RPC | `message_conversations`, `message_messages`, `message_participants`; `start_direct_conversation`, `post_patient_message`, … | Thread list in React Query; optional gateway encryption for bodies |
| **Provider connections** | RPC on action | `request/respond/cancel/disconnect_patient_provider_connection`; `patient_provider_consents`, `patient_provider_activities` | Fetched on screen open (no SQLite mirror of connection rows) |
| **Payer connections** | RPC on action | `request/respond/cancel/disconnect_patient_payer_connection` | Same |
| **Family spouse connect** | RPC | `lookup_user_for_family_connect`, `create/respond/cancel_family_connection_request`, `remove_family_adult_member` | Repository pull mirrors results into SQLite |
| **Nearby providers browse** | RPC when online | `nearby_providers`, `search_providers_by_name` | Cached page in SQLite `providers` (not full sync) |
| **Payer / insurance directory** | Read APIs | `payer_directory`, payer org detail | React Query / on-demand |
| **Org documents (provider/payer)** | Storage + metadata APIs | `provider_documents`, `payer_documents`, storage bucket | Not in sync engine |
| **Push notification registration** | Direct upsert | Device push token tables / edge functions | N/A |
| **Premium checkout** | Edge / Paystack | `subscriptions` updated server-side; device pulls via `subscriptions` handler | |
| **Connection care team list** | RPC on org view | `list_connected_org_care_team` | No local table |

---

## QA / DB validation checklist

After **Settings → Sync now** on a signed-in device (online):

### Always expect updated

1. **`sync_metadata`** (local only) — `last_sync_at` recent on device (not in Supabase).
2. **`profiles`** — matches Me → Edit profile fields.
3. **`emergency_profiles`** — matches Emergency card (if configured).
4. **`settings`** — theme / notification preference if changed.
5. **`mini_app_snapshots`** — one row per active mini-app key with JSON `payload` matching tracker state.
6. **`bookmarks` / `article_reads`** — if user bookmarked or marked articles read.
7. **`provider_favorites`** — if user favorited providers.
8. **`subscriptions`** — reflects Paystack/App Store entitlement after purchase (pull-only).

### Expect after specific actions

| User action | Look in Supabase |
|-------------|------------------|
| Toggle provider favorite | `provider_favorites`, possibly `providers` stub |
| Save medication / pregnancy / etc. | `mini_app_snapshots` for that `app_key` |
| Timeline event from mini-app | `health_timeline_events` |
| Family child added | `family_members`, `family_households` |
| Spouse invite sent | `family_connection_requests` |
| Request provider connection | `patient_provider_connections` (via RPC, not sync queue) |
| Send chat message | `message_messages` + `message_conversations` (immediate, not sync queue) |
| Mark notification read | `notifications.read_at` |

### Pull-only (device should mirror server)

| Server table | Device surface |
|--------------|----------------|
| `articles` | Learn / Home news & evergreen |
| `health_tips` | Tips screens |
| `ad_*` tables | Ad placements |
| `articles` + `health_tips` | Available offline after pull |

### Common “missing data” causes

| Symptom | Likely cause |
|---------|----------------|
| Mini-app data not on server | Guest mode (snapshots not enqueued) or pending row in `sync_queue` |
| Profile not updated | Gateway configured but push failed; check `sync_queue.last_error` on device |
| Connection not in DB | Used RPC path — check `patient_*_connections`, not sync queue |
| Message not in DB | Messaging is direct; check Realtime / RPC errors, not sync |
| Articles stale | Staff has not synced Currents to Supabase; device pull is working but server catalog unchanged |
| Favorites reappeared | Pull ran before push completed; should settle after next successful sync |

---

## Inspecting the outbox on device

SQLite table **`sync_queue`** (not mirrored to Supabase):

| Column | Meaning |
|--------|---------|
| `entity_type` | Handler key (see push table) |
| `entity_id` | Primary key of the local row |
| `operation` | `create` \| `update` \| `delete` |
| `payload` | JSON snapshot sent to `push` |
| `attempts` | Failed push count (stops at `SYNC_CONFIG.maxRetries` = 5) |
| `last_error` | Last Supabase/gateway error message |

**Settings → Sync now** resets `attempts` on exhausted rows and retries the full queue.

---

## Related docs

- [Sync Engine](./SYNC_ENGINE.md) — triggers, retries, delete semantics
- [Data Layer](./data-layer.md) — repository method index
- [Supabase alignment](./supabase-alignment.md) — schema ownership
- [Provider messaging](../../caremate-provider-portal/docs/messaging.md) — org/patient/direct thread rules
