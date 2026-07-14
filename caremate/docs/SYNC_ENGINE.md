# Sync Engine

[← Back to index](./README.md)

CareMate is **offline-first**: SQLite is the source of truth on device. Supabase is updated asynchronously through an outbox (`sync_queue`) and the sync engine in `src/sync/`.

Screens and domain UI **never** call Supabase for CRUD. They write through repositories (or mini-app synced storage); the engine drains the queue when the network allows.

Related: [Data Layer](./data-layer.md) · [ADR-002](./adr/002-why-sqlite.md) · [ADR-003](./adr/003-why-supabase.md) · [ADR-005](./adr/005-repository-pattern.md)

---

## Mental model

```
UI (edit / tap save)
      ↓
Repository (or mini-app snapshot save)
      ↓
SQLite  ←── user-visible truth (immediate)
      ↓
Pending queue (`sync_queue`)
      ↓
Network available? ──no──→ wait (offline / closed / later)
      ↓ yes
Sync engine push
      ↓
Supabase upsert / delete
      ↓
Queue row removed → Synced
```

The same path applies whether the user was online for the whole edit or worked offline and came online later.

---

## Example: Edit Emergency Profile

```
Edit Emergency Profile
      ↓
emergencyRepository.save(userId, input)
      ↓
SQLite  (`emergency_profiles`, sync_status = pending)
      ↓
Pending Queue  (`sync_queue` entity_type = emergency_profiles)
      ↓
requestSync()  (debounced ~1.5s if online; otherwise waits)
      ↓
┌─────────────────────────┐
│ Offline?                │
│  → stay pending         │
│  → UI already updated   │
└───────────┬─────────────┘
            │ Network restored / foreground /
            │ startup / daily safety / interval
            ↓
Sync engine: handler.push → Supabase `emergency_profiles`
      ↓
Queue row deleted
      ↓
Synced
```

Lock / home widget refresh is **separate** from cloud sync: `syncEmergencyLockSurface` updates AsyncStorage + native widgets on save, even when offline.

---

## Example: Online immediate sync

When Supabase is configured and the device is online, a write does not wait for restart:

```
Save profile favorite / bookmark / emergency
      ↓
SQLite + enqueue
      ↓
queue.ts → syncEngine.requestSync({ reason: 'write' })
      ↓
~1.5s debounce (bursts coalesce)
      ↓
runSyncCycle → push → pull
      ↓
Supabase + optional mini-app rehydrate
```

---

## Example: Work offline, sync later

```
Daytime (no internet)
  Edit meds / emergency / bookmarks
        ↓
  SQLite + growing sync_queue
        ↓
  App may be backgrounded or closed

Evening / next open / reconnect
        ↓
  Network restored
        ↓
  Engine drains entire queue → Supabase
        ↓
  Synced
```

Safety nets if the user never hits “reconnect while app open”:

| Trigger | Role |
|---------|------|
| App cold start online | Drain queue |
| Foreground (`AppState` active) | Drain queue |
| Reconnect watcher | Drain queue |
| Local midnight (app still open) | Drain queue |
| Background task (~daily) | Best-effort while closed (OS schedule; not exact 12:00) |
| Open-app interval (~1 min) | Extra open-app safety |

Exact midnight with the process killed is **not** guaranteed by iOS/Android. Guaranteed catch-up = next successful online cycle (open, reconnect, or background when the OS allows).

---

## Pull path (remote → device)

After push (or on any successful cycle while online):

```
runSyncCycle
      ↓
pushPendingChanges()
      ↓
pullRemoteChanges()  — each registered handler.pull()
      ↓
SQLite upserts (domain tables / mini_app_snapshots)
      ↓
If signed-in and no pending mini-app queue rows:
  rehydrate Zustand stores from snapshots
```

Pending **local** mini-app snapshots that are newer than remote are not overwritten on pull (see snapshot repository merge rules).

---

## Mini-app path (signed-in)

```
Zustand persist setItem
      ↓
AsyncStorage (fast UI cache)
      ↓
miniAppSnapshotRepository.save  (guest → no-op)
      ↓
SQLite mini_app_snapshots + sync_queue
      ↓
… same pending → network → Supabase mini_app_snapshots → Synced
```

Guests never enqueue cloud snapshots ([ADR-004](./adr/004-guest-first.md)).

---

## Sync cycle internals

```
runSyncCycle
  │
  ├─ online && Supabase configured?
  │     no → return
  │
  ├─ migrateMiniAppsToSnapshots (signed-in upgrade path)
  ├─ pushPendingChanges
  │     for each sync_queue row (oldest first):
  │       getSyncHandler(entityType)
  │       push → delete row  |  fail → attempts++ / last_error
  ├─ pullRemoteChanges
  │     for each registered handler: pull()
  └─ rehydrate mini-apps (if safe) + write sync_metadata
```

### Entity handlers (registered)

| `entity_type` | Domain / kit |
|---------------|--------------|
| `profiles` | `domains/profile` |
| `settings` | `domains/profile` |
| `emergency_profiles` | `domains/emergency` |
| `providers` | `domains/providers` |
| `articles` | `domains/articles` (pull-focused) |
| `bookmarks` | `domains/articles` |
| `mini_app_snapshots` | `mini-apps/_kit` |

Handlers are registered in `src/sync/register-default-handlers.ts` via `registerSyncHandler` (`src/sync/registry.ts`). New domains should **register**, not edit a hard-coded map inside `engine.ts`.

---

## Source map

| File | Responsibility |
|------|----------------|
| `src/sync/engine.ts` | Start/stop, triggers, `runSyncCycle` |
| `src/sync/queue.ts` | Enqueue / complete / fail; calls `requestSync` on write |
| `src/sync/network.ts` | Online detection (`expo-network`) |
| `src/sync/registry.ts` | Handler registry |
| `src/sync/register-default-handlers.ts` | Core + mini-app handler wiring |
| `src/sync/background-daily-sync.ts` | `expo-background-task` registration |
| `src/constants/config.ts` → `SYNC_CONFIG` | Retries, debounce, interval |

### `SYNC_CONFIG`

| Key | Typical | Meaning |
|-----|---------|---------|
| `maxRetries` | 5 | Stop retrying a queue row after N failures |
| `retryDelayMs` | 2000 | Documented retry spacing (attempts stored on row) |
| `writeDebounceMs` | 1500 | Coalesce rapid local writes |
| `pullIntervalMs` | 60000 | Open-app interval safety net |

---

## Failure behavior (retries)

```
push throws
      ↓
markSyncOperationFailed (attempts++, last_error)
      ↓
Row stays in queue
      ↓
Later cycle retries until maxRetries
```

| Field on `sync_queue` | Role |
|-----------------------|------|
| `attempts` | Incremented on each failed push |
| `last_error` | Last error message (debug / support) |
| `updated_at` | When the row last changed |

When `attempts >= SYNC_CONFIG.maxRetries` (default **5**), the engine **skips** the row on later cycles. It is **not** auto-deleted — it remains for inspection until a future recovery path clears or resets it.

Unknown `entity_type` rows are dropped from the queue (complete without push) so a typo does not block forever — prefer registering handlers before shipping writes.

Pull errors are isolated per handler so one remote table cannot block others.

There is **no exponential backoff clock** in the engine today: failed rows are simply tried again on the next cycle (reconnect, interval, foreground, etc.). Spacing between cycles is effectively the trigger cadence, not `retryDelayMs` applied per row (that constant is reserved for future/retry policy docs).

---

## Delete

Sync operations are typed as `create | update | delete` (`SyncOperation`).

```
Local remove (e.g. un-bookmark)
      ↓
Soft-delete locally  (deleted_at set, sync_status = pending)
  — or hard-delete locally, depending on entity
      ↓
Enqueue operation: 'delete' + entityId (+ payload as needed)
      ↓
Push: handler.syncToRemote(..., 'delete', ...)
      ↓
Supabase .delete().eq('id', entityId)
      ↓
Queue row removed → Synced
```

**Soft delete (device):** Entity tables include `deleted_at`. Reads filter `deleted_at IS NULL` (bookmarks, providers, articles, profiles, …). Soft-deleted rows can still be present for undo/debug until purged.

**Hard delete (cloud on push):** Handlers treat `operation === 'delete'` as a remote delete by primary key (e.g. bookmarks, emergency_profiles, mini_app_snapshots).

**Not fully symmetric yet:** Pull paths generally **upsert** remote rows and clear `deleted_at`; they do not always tombstone local rows when a remote row disappears. Treat “delete on another device → this device” as an area to harden when multi-device becomes critical.

---

## Version

CareMate does **not** use a global CRDT or per-field vector clock. “Version” appears in three different senses:

| Kind | Where | Meaning |
|------|--------|---------|
| **Row timestamp** | `updated_at` (ISO) on SQLite / Supabase / queue payloads | Primary ordering hint for “what’s newer” |
| **Sync status** | `sync_status`: `pending` \| `syncing` \| `synced` \| `failed` | Local lifecycle relative to the outbox |
| **Zustand persist `version`** | Mini-app stores (e.g. immunization `version: 1` + `migrate`) | **Schema** migration for AsyncStorage shape — not a cloud sync version |

Outbound queue rows carry the **payload snapshot at enqueue time**. Rapid edits enqueue multiple rows; they apply in `created_at` order (last successful push for that entity usually wins on Supabase via upsert by `id`).

There is **no** dedicated `sync_version` integer incremented on every write today. If two devices edit the same id, the later successful **upsert** (by wall-clock `updated_at` or whichever push lands last) wins.

---

## Merge

Merge is **document / row replace**, not field-level 3-way merge.

```
Pull remote row
      ↓
Local row missing → INSERT
Local row exists  → UPDATE whole mapped columns (or skip — see Conflict)
```

| Surface | Merge behavior |
|---------|----------------|
| Emergency / profile / settings / providers / articles | Upsert by `id`; pull uses `onConflictDoUpdate` with remote field set |
| Bookmarks | Upsert / delete as discrete rows |
| Mini-app snapshots | Entire JSON `payload` replaced; no deep key merge |

Rehydrate after pull overwrites Zustand from the SQLite snapshot blob (when no pending mini-app queue rows), so UI state converges to the stored document.

---

## Conflict

**Policy today: last-write / local-pending preference (shallow), not interactive conflict UI.**

### Core entities (emergency, profile, …)

```
Device A saves → queue → push upsert
Device B pulls → onConflictDoUpdate with remote values
```

If A has **pending** local changes and a pull runs mid-flight, many core pull paths still apply remote upsert without comparing `updated_at`. Safer pattern used for **mini-app snapshots**:

```
if local.sync_status === 'pending'
   AND local.updated_at > remote.updated_at
  → skip remote apply (keep local pending)
else
  → apply remote
```

```
        Remote newer / local already synced
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   Apply remote              Keep local pending
   (pull wins)               (push still owed)
```

### Same device, many edits

Multiple queue entries for one `entity_id` are processed in order. Supabase upsert by id means the **last pushed payload** is what remote stores. Stale intermediate payloads are harmless if they succeed in sequence; if an older payload is pushed after a newer one (rare, e.g. reordered failures), remote can go briefly stale until the newer row pushes.

### Cross-device classic conflict

```
Phone offline: edit blood group → A
Tablet online: edit blood group → B, pushes
Phone comes online: pushes A, then pulls
      ↓
Without richer rules, A or B "wins" by upsert/order —
no “pick a side” dialog is shown to the user.
```

**Product intent (Phase 1):** single primary device + backup; conflicts are rare. Phase 2+ (family / multi-device) should add explicit LWW by `updated_at` on **all** pulls, and optionally server `updated_at` checks before push.

### Diagram: resolve on pull (mini-apps)

```
Local pending? ──no──→ apply remote
       │
      yes
       │
local.updated_at > remote.updated_at ?
       │
      yes → keep local, skip (push later)
       │
       no → apply remote (remote wins or equal)
```

---

## Guest vs signed-in

| | Guest | Signed-in |
|--|-------|-----------|
| Local SQLite / AsyncStorage | ✅ | ✅ |
| `sync_queue` → Supabase | Skipped when no session / guest id | ✅ when online + configured |
| Mini-app cloud snapshots | ❌ | ✅ |

Demo / unconfigured Supabase: app stays fully local; engine no-ops remote I/O when `config.isSupabaseConfigured` is false.

---

## Bootstrap

`AppProviders` → DB init → auth → `syncEngine.start()` (+ daily background registration).

Sign-in / session restore triggers `requestSync({ immediate: true })` so account data migrates and pulls promptly.

---

## Adding a synced entity

1. SQLite table + schema / migration SQL  
2. Domain repository: local write + `queueSync({ entityType, … })`  
3. `syncToRemote` / `pullFromRemote` on the repository  
4. `registerSyncHandler('your_entity', { push, pull })`  
5. Matching Supabase table + RLS (`npm run supabase:db:push`)  
6. Screen uses repository only  

Mini-apps: follow [mini-app-contract.md](./mini-app-contract.md) (snapshot key + kit storage); they share the `mini_app_snapshots` handler.
