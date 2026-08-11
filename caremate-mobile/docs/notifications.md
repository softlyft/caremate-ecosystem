# Notifications strategy

[← Back to index](./README.md)

> **Status:** Local in-app inbox + **cloud sync** for signed-in users (SQLite ↔ Supabase `notifications`). Product email via **Amazon SES** (Edge Functions). Push scaffold wired (**Expo Notifications** + `notification_devices` + family request/accept/decline OS push + **Messages** via `notify-message`). Quiet hours and category prefs still pending.  
> Preference toggle (`notificationsEnabled`) gates token registration and is respected for product push.

## Decisions (locked)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Home bell | Dedicated **Notifications** screen. Cards are **read-only**: title + body only — **no CTA**, no deep-link actions in v1. |
| 2 | Email | **Amazon SES** for product / transactional mail (family invites, billing). Auth password-reset stays on **Supabase Auth** email. |
| 3 | Family | Keep matrix as documented (request → receiver in-app + push + email; accept/decline → sender). |
| 4 | Kid reminders | Notify **both connected parents** in the household (meds / vaccines for a child). |
| 5 | Quiet hours | **Yes, but category-dependent** — reminder pushes can defer; security / billing / family-request can bypass. |
| 6 | Guests | **In-app only** until they create / sign into an account. No push token upload, no SES product email. |
| 7 | Data model | Event + delivery fan-out (see [Data model](#data-model-scalable)). |

---

## Channels

| Channel | What it is | Typical trigger |
|---------|------------|-----------------|
| **In-app** | Notifications screen (bell → list of cards) | Everything user-relevant |
| **Push** | OS notification via Expo Notifications / FCM / APNs | Time-sensitive when away from app |
| **Email** | Amazon SES (product) + Supabase Auth (password reset) | Invites, receipts, security |

Rules of thumb:

1. **In-app** is the durable record (always write an inbox row when the user should see it later).
2. **Push** when waking the phone helps; still create the in-app card.
3. **Email** for durable / cross-device / invite delivery — not for routine dose pings.
4. Respect master + category prefs before push and product email. Auth/security email is always allowed.
5. **v1 inbox cards are informational only** — title + body. No buttons, no navigation from the card.

Legend:

| Mark | Meaning |
|------|---------|
| ✅ | Planned |
| ✅ (Receiver) / ✅ (Sender) / ✅ (Both parents) | Audience |
| ⚪ | Optional later |
| — | Not planned / N/A |

---

## In-app UX (bell)

```
Home header Bell
  → /(app)/notifications  (dedicated screen)
      → Flat list of cards
          ├── Title
          └── Body
```

**Implemented (local inbox):**
- SQLite `notifications` table + Drizzle migration `0001_*`
- Repository / `createInAppNotification` helper for domains to enqueue cards
- **Signed-in sync:** create / mark-read / guest→account migrate queue to Supabase; pull merges server rows (including edge push/email inbox rows) by id or `dedupe_key`
- Guests stay local-only until account creation
- Notifications screen with read-only cards; opening marks all as read
- Indigo header / unread card treatment (`features/notifications/NotificationCard.tsx`) — distinct from Nearby blue and brand teal
- Home bell navigates here; unread red dot when `read_at` is null
- Guest inbox migrates onto signed-in `user_id`
- First emitter: family connection request received / accepted / declined (on pull)
- Onboarding welcome guide card (first inbox item after Phase A; migrates guest → account)

**Implemented (push scaffold + family):**
- `expo-notifications` + `notification_devices` (RLS own rows)
- Mobile `syncPushRegistration` / `clearPushRegistration` (guests skip; prefs off clears token)
- Edge `_shared/push.ts` → Expo Push API; `notify-family-email` sends request push (+ SES) to receiver and accept/decline push to sender
- Quiet hours / med-checkup OS pushes still later

- Unread badge / dot on the bell when any `read_at IS NULL`.
- Opening the screen (or viewing a card) marks items read.
- Empty state when none.
- Guests see local in-app history only; signing in enables push + email for future events (and can migrate local rows — see guest section).

**Explicit non-goals for v1 inbox**

- No “Open medication” / “View request” CTAs on cards.
- No swipe-to-action.
- Family request **actions** stay on existing Family → Requests screens; the notification only *informs*.

---

## Domain matrix

### Family

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Send family / spouse connection request | ✅ | ✅ (Receiver) | ✅ (Receiver via SES) | Highest-value social notify |
| Accept connection | ✅ | ✅ (Sender) | ⚪ | Confirm to requester |
| Decline connection | ✅ | ✅ (Sender) | — | Keep light |
| Household created / child added | ✅ | — | — | Self-only confirmation |
| Child profile updated (shared household) | ✅ | ✅ (Spouse) | — | If spouse sharing is on |

### Profile & settings

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Notifications preference changed | ✅ | — | — | Gate for other pushes |
| Theme / language / region changed | ✅ | — | — | Local only |
| Patient ID generated | ✅ | — | — | Sensitive; no external notify |

### Emergency

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Emergency profile saved / synced | ✅ | ⚪ (Self) | — | Soft “saved offline + cloud” |
| ICE contact added / edited | ✅ | — | — | **Do not** notify ICE contacts |
| Critical medical fields changed | ✅ | ⚪ (Self) | — | Optional self review nudge |

### Auth

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Sign-up / welcome | ✅ | ⚪ | ⚪ SES | Welcome + app guide on Phase A complete |
| Password reset request | — | — | ✅ Supabase Auth | Keep as-is |
| Password updated | ✅ | ⚪ (Self) | ⚪ SES | Security awareness |
| Sign-in from new device (future) | ✅ | ✅ (Self) | ✅ SES | Security |

### Billing / Premium

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Subscription activated | ✅ | ✅ (Subscriber) | ✅ SES | Receipt / welcome |
| Renewal approaching | ✅ | ✅ (Subscriber) | ✅ SES | |
| Payment failed / lapsed | ✅ | ✅ (Subscriber) | ✅ SES | High priority; may bypass quiet hours |
| Family plan covers spouse | ✅ | ✅ (Spouse) | ⚪ | Entitlement granted |

### Learn / articles

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Bookmark saved | ✅ | — | — | |
| New tips / trending (opt-in) | ✅ | ⚪ | ⚪ | Separate marketing opt-in later |
| Regional `health_alert` (future) | ✅ | ✅ (Region users) | ⚪ | High severity only for email |

### Nearby / providers / messages

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Favorite toggled | ✅ | — | — | |
| Nearby refresh | — | — | — | Too noisy |
| Appointment at provider (future) | ✅ | ✅ (Self) | ⚪ | |
| Org / clinic message | Messages inbox | ✅ (Self) | — | Edge `notify-message` (org mode); deep link `/messages/{id}` |
| Direct message (practitioner chat) | Messages inbox | ✅ (Self) | — | Edge `notify-message` (`mode: 'direct'`) |
| Notifications bell inbox | ✅ | — | — | Separate from Messages (family, meds tips, etc.) |

### Sync / reliability

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Pending / failed sync banner | ✅ | — | — | Existing sync status UX |
| Exhausted retries on important data | ✅ | ⚪ (Self) | — | Emergency / mini-app data |

---

## Mini-app matrix

### Medication Assistant

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Dose due | ✅ | ❌ (MVP) | — | Inbox only until push ships; dedupe `med:dose:{id}:{date}:{slot}` |
| Dose missed | ✅ | ❌ (MVP) | — | After ~60 min grace; dedupe `med:missed:…` |
| Refill due | ✅ | ❌ (MVP) | — | Quantity threshold or refill due date; dedupe `med:refill:…` |
| Dose logged / undone | — | — | — | No inbox card for log/undo in MVP |
| Medicine added / paused | — | — | — | |

Kid doses notify the signed-in user only in MVP (both-parents fan-out waits for push/cloud).

### Immunization Tracker

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Vaccine due soon (≤14 days) | ✅ | ✅ (Both parents) | ⚪ | |
| Vaccine overdue | ✅ | ✅ (Both parents) | ⚪ | |
| Dose recorded | ✅ | ⚪ (Spouse) | — | Household sharing |

### Checkup Planner

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Checkup due this year | ✅ | ✅ (Self) | ⚪ | Annual digest optional |
| Checkup overdue | ✅ | ✅ (Self) | — | |
| Marked complete | ✅ | — | — | |

### Pregnancy Tracker

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Milestone week soon (≤7 days) | ✅ | ⚪ (Self) | — | `evaluatePregnancyAlerts`; OS push deferred |
| Due date approaching / due day / past due | ✅ | ⚪ (Self) | — | In-app inbox only today |
| Daily log nudge | ✅ | ⚪ (Self) | — | Gentle; respects notifications toggle |
| Maternal TT2 due (≥4 weeks after TT1) | ✅ | ⚪ (Self) | — | Mother-care ladder; works without pregnancy timeline |
| Partner share (future) | ✅ | ✅ (Partner) | — | |

### Period Tracker

| Action | In-app | Push | Email | Notes |
|--------|:------:|:----:|:-----:|-------|
| Predicted period start | ✅ | ✅ (Self) | — | |
| Fertile window / ovulation (future) | ✅ | ⚪ (Self) | — | Opt-in sensitive |
| Period logged | ✅ | — | — | |
| Partner share (future) | ✅ | ✅ (Partner) | — | Explicit consent |

---

## Quiet hours (category-dependent)

Quiet hours apply to **push** (and optionally email digests), not to writing the in-app card.

| Category | During quiet hours |
|----------|--------------------|
| Reminders (meds, vaccines, checkups, period/pregnancy nudges) | **Defer** push until quiet window ends |
| Social (family request / accept / decline) | **Deliver** — time-sensitive human action |
| Billing (fail / lapse) | **Deliver** |
| Security (password / new device) | **Deliver** |
| Tips / marketing | **Suppress** or hold for digest |

Prefs (future, beyond today’s boolean):

| Pref | Default |
|------|---------|
| Master notifications | On (`notificationsEnabled`) |
| Quiet hours enabled | Off until user sets window |
| Quiet hours start / end + timezone | User-local |
| Push — reminders | On |
| Push — social | On |
| Push — tips / marketing | Off |
| Email — billing | On |
| Email — social invites | On |
| Email — digests | Off |

---

## Guests

| Channel | Guest | Signed-in |
|---------|-------|-----------|
| In-app inbox | ✅ Local SQLite only | ✅ Syncs to cloud |
| Push | — | ✅ After token registration |
| Email (SES) | — | ✅ When policy says so |

On guest → account migration: attach local inbox rows to the new `user_id` (same pattern as other guest local data).

---

## Delivery model

```
Domain / mini-app event
  → notification policy (audience × channels × prefs × quiet hours)
      → create notifications row(s)   // one per recipient
          ├── delivery: in_app  → always “sent” when row exists (inbox)
          ├── delivery: push    → Expo push (defer if quiet hours)
          └── delivery: email   → Amazon SES (transactional templates)
```

Audience helpers:

| Audience | Meaning |
|----------|---------|
| Self | Owner of the data |
| Receiver / Sender | Family request parties |
| Both parents | All adult `linked_user_id` members on the child’s household |
| Spouse | Connected household partner |
| Subscriber | Billing account holder |

---

## Data model (scalable)

Goal: one **logical notification per recipient**, many **channel deliveries**, offline-first inbox, cloud fan-out for push/email, safe dedupe for reminders.

### Why not a single flat table?

A single `notifications(channel, …)` row per send works for prototypes but:

- Duplicates title/body when the same event goes in-app + push + email
- Makes “mark read” and unread counts awkward across channels
- Harder to retry push/email independently

**Chosen shape:** event content once, deliveries per channel.

### Cloud (Supabase / Postgres) — source for signed-in sync

```sql
-- Logical inbox item (what the Notifications screen shows)
notifications (
  id                uuid PK,
  user_id           uuid NOT NULL REFERENCES auth.users,
  domain            text NOT NULL,   -- family | medication | immunization | …
  event_type        text NOT NULL,  -- family.request_received | med.dose_due | …
  title             text NOT NULL,
  body              text NOT NULL,
  severity          text NOT NULL DEFAULT 'info',  -- info | important | critical
  -- Optional future deep-link metadata (unused in v1 UI — no CTA)
  entity_type       text,
  entity_id         text,
  data              jsonb NOT NULL DEFAULT '{}',
  dedupe_key        text,           -- e.g. med:dose:{medId}:{date}:{slot}
  read_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)      -- NULL dedupe_key allowed for one-offs
)

-- Per-channel send attempts
notification_deliveries (
  id                   uuid PK,
  notification_id      uuid NOT NULL REFERENCES notifications ON DELETE CASCADE,
  channel              text NOT NULL,  -- in_app | push | email
  status               text NOT NULL,  -- pending | sent | failed | skipped | deferred
  provider             text,           -- expo | ses | supabase_auth
  provider_message_id  text,
  error                text,
  scheduled_for        timestamptz,    -- quiet-hours deferral
  attempt_count        int NOT NULL DEFAULT 0,
  sent_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, channel)
)

-- Device push tokens
notification_devices (
  id               uuid PK,
  user_id          uuid NOT NULL REFERENCES auth.users,
  expo_push_token  text NOT NULL UNIQUE,
  platform         text NOT NULL,  -- ios | android
  last_seen_at     timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
)

-- Extended prefs (can start as columns on profiles/app_settings, graduate here)
notification_preferences (
  user_id                 uuid PK REFERENCES auth.users,
  notifications_enabled   boolean NOT NULL DEFAULT true,
  quiet_hours_enabled     boolean NOT NULL DEFAULT false,
  quiet_hours_start       time,          -- local
  quiet_hours_end         time,
  timezone                text,
  push_reminders          boolean NOT NULL DEFAULT true,
  push_social             boolean NOT NULL DEFAULT true,
  push_marketing          boolean NOT NULL DEFAULT false,
  email_billing           boolean NOT NULL DEFAULT true,
  email_social            boolean NOT NULL DEFAULT true,
  updated_at              timestamptz NOT NULL DEFAULT now()
)
```

RLS: `user_id = auth.uid()` for select/update (read_at). Inserts for other users (e.g. family request → receiver) via **service role / Edge Function**, never from the client as another user.

### Local (SQLite) — guest + offline inbox

Mirror the inbox the UI needs:

```
notifications (
  id, user_id, domain, event_type, title, body, severity,
  entity_type, entity_id, data_json, dedupe_key, read_at,
  created_at, …syncColumns
)
```

- Guests write **local-only** rows (`user_id = guest`).
- Signed-in devices **pull** inbox from Supabase (and mark `read_at` through sync / direct update).
- Push token registration and SES sends happen **server-side or via trusted backend**; the app does not need a local `notification_deliveries` table for v1 UI.

### Dedupe examples

| Event | `dedupe_key` |
|-------|----------------|
| Med dose due | `med:dose:{medicationId}:{YYYY-MM-DD}:{slotIndex}` |
| Vaccine due soon | `imm:due:{childId}:{vaccineId}:{YYYY-MM-DD}` |
| Family request | `family:request:{requestId}:{toUserId}` |
| Billing failed | `billing:failed:{invoiceId}` |

Re-firing the same reminder updates/skips instead of spamming the inbox.

### Why this scales for CareMate

| Need | How the model helps |
|------|---------------------|
| Offline-first inbox | SQLite `notifications` + sync pull |
| Multi-channel without copy spam | One content row → N deliveries |
| Quiet hours | `deliveries.status = deferred` + `scheduled_for` |
| Both parents | Policy emits two `notifications` rows (same `dedupe_key` prefix, different `user_id`) |
| Retry push/email | Independent delivery rows + attempt_count |
| Future CTAs | `entity_*` / `data` ready; UI stays title+body until we opt in |
| Guest → account | Remap local `user_id` like other guest data |
| SES + Expo | `provider` + `provider_message_id` for audit |

---

## Email (Amazon SES)

| Use Amazon SES | Keep Supabase Auth mail |
|----------------|-------------------------|
| Family connection invite / request received | Password reset |
| Billing receipts / failed payment / renewal reminders | Email confirmation (if enabled) |
| Optional welcome / security alert templates | |

Templates are code-owned HTML in `supabase/functions/_shared/email-templates/`, sent from Edge Functions with AWS SES credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM_EMAIL=hello@getcaremate.com`, `SES_FROM_NAME=CareMate`) — **never** from the mobile client.

---

## Suggested ship order

1. SQLite + cloud `notifications` inbox + **Notifications screen** (bell) — title/body cards, read state  
2. Family request / accept / decline — in-app + push + SES to receiver  
3. Medication dose due / missed — in-app + push (both parents when for kid)  
4. Immunization + checkup due — in-app + push  
5. Quiet hours prefs + deferral worker  
6. Pregnancy / period predictions — in-app + push  
7. Billing lifecycle — in-app + push + SES  
8. Opt-in tips / health alerts  

---

## Related code / docs

| Piece | Path |
|-------|------|
| Pref toggle (settings / onboarding) | `app_settings.notifications_enabled`, profile store |
| Home bell (UI only today) | `src/features/home/components/HomeHeader.tsx` |
| Feature stub | `src/features/notifications/` |
| SES shared sender | `supabase/functions/_shared/ses.ts`, `email.ts`, `email-templates/` |
| Family request email | `supabase/functions/notify-family-email` |
| Billing emails | webhooks + `verify-checkout` + `billing-renewal-reminders` + `send-billing-email` |
| Family flows | [Family profiles](./family-profiles.md) |
| Mini-apps | [Mini-apps](./mini-apps.md) |
| Roadmap | [Roadmap](./roadmap.md) |
| Sync patterns | [Sync Engine](./SYNC_ENGINE.md) |
