# CareMate PostHog Analytics v1

[← Back to index](./README.md)

Product analytics and retention measurement. Launch-ready specification.

| | |
|---|---|
| Version | v1.0 |
| Status | v1 instrumented in the mobile app via `src/lib/monitoring`. `broadcast_viewed` is defined but unwired — there is no broadcast surface. |
| Primary focus | WAU, MAU, D7, D30, feature usage, and retention behavior |
| SDK | Mobile PostHog client in `src/lib/monitoring` (see [Configuration](./configuration.md)) |

---

## 1. Purpose

CareMate uses PostHog to understand how people use the product. The CareMate database remains the source of truth for accounts, health records, providers, payers, subscriptions, and relationships.

PostHog v1 does not track everything. It answers six questions:

1. Are more people using CareMate each week?
2. Are more people using CareMate each month?
3. Are new users coming back after 7 days?
4. Are new users coming back after 30 days?
5. Which CareMate features and mini-apps are used most?
6. Which behaviors are associated with stronger retention?

---

## 2. Analytics architecture

Three layers.

### CareMate database

Source of truth for what exists:

- Users and profiles
- Countries and languages
- Providers and payers
- Provider and payer claims
- Patient and family relationships
- Subscriptions and payments
- Health records, medications, vitals, appointments, and documents

### PostHog

Source of truth for product behavior:

- What users view and interact with
- Which features they discover
- Which actions they perform
- Where they drop off
- Which behaviors correlate with retention
- How they move through the product

### Internal and executive metrics

Combine the two later for questions such as:

- How many active users have connected a provider?
- Do users who connect a provider retain better?
- Which mini-app users are most likely to subscribe?

Those can be analyzed manually at first, then become dashboards.

---

## 3. Core metrics

### 3.1 WAU — weekly active users

Unique users who perform at least one qualifying CareMate activity in a rolling 7-day period.

WAU is not “opened the app.” Qualifying activity is the `caremate_active` event.

### 3.2 MAU — monthly active users

Unique users who perform at least one qualifying CareMate activity in a rolling 30-day period.

### 3.3 WAU / MAU

`WAU ÷ MAU` is an early signal of how often monthly users return. Watch the trend. Do not set an arbitrary target yet.

---

## 4. Retention

Retention is measured from the user’s first meaningful CareMate experience, not from first app open.

| Metric | Definition |
|---|---|
| D7 | Percentage of users who return and perform a qualifying activity around seven days after initial activation |
| D30 | Percentage of users who return and perform a qualifying activity around thirty days after initial activation |

Keep this definition stable. Do not change it later because another method produces a better number.

`app_opened` is not a qualifying activity and must not be used as the retention return event.

---

## 5. The `caremate_active` event

This is the central event for v1. It represents a meaningful interaction with CareMate, and it is the only event that counts toward WAU, MAU, D7, and D30.

Fire it when the user does something that matters, not on every tap, scroll, or screen transition. Feature-specific events below are the breakdown of *what* they did. `caremate_active` is the flag that the action counts.

### Properties

| Property | Role |
|---|---|
| `activity_type` | Kind of meaningful action, for example `feature_used` or `content_viewed` |
| `feature` | Feature or mini-app key |
| `surface` | Where it happened, for example `mini_app` or `learning` |
| `country` | Country |
| `language` | Language |
| `app_version` | App version |
| `platform` | `ios` or `android` |

Examples:

```text
caremate_active
  activity_type = feature_used
  feature = medication-tracker
  surface = mini_app

caremate_active
  activity_type = content_viewed
  feature = learning
  surface = learning
```

---

## 6. Lifecycle events

These describe entry into the product. They do not replace `caremate_active`.

### `app_opened`

Basic open and session behavior. Not a qualifying activity.

| Property |
|---|
| `platform` |
| `app_version` |
| `country` |
| `language` |
| `session_id` |

### `user_signed_up`

| Property |
|---|
| `signup_method` |
| `country` |
| `language` |

Do not send email, phone number, full name, health information, message content, or other unnecessary personal data.

Identify the PostHog person with the CareMate user id after sign-in. Do not use email or phone as the distinct id.

### `onboarding_started` and `onboarding_completed`

Used for the initial onboarding funnel.

---

## 7. Mini-app analytics

The six mini-apps are a core part of v1. Use one event structure, not a separate event name per mini-app.

| Event | Properties |
|---|---|
| `mini_app_viewed` | `mini_app` |
| `mini_app_started` | `mini_app` |
| `mini_app_used` | `mini_app`, `action` |
| `mini_app_completed` | `mini_app` |

`mini_app_used` is a qualifying action and should also emit `caremate_active`. Viewing a mini-app alone is discovery, not activation, unless product later decides otherwise.

### 7.1 `mini_app` values

Use the same ids as `MINI_APPS` in `src/mini-apps/_kit/registry.ts`. Do not invent a second analytics name.

| `mini_app` / `feature` | Product name |
|---|---|
| `vitals-tracker` | Vitals |
| `medication-tracker` | Medication Assistant |
| `checkup-planner` | Checkup Planner |
| `immunization-tracker` | Immunization Tracker |
| `pregnancy-tracker` | Pregnancy Tracker |
| `period-tracker` | Period Tracker |

When `caremate_active.feature` is a mini-app, use this same id. Do not emit `vitals`, `medication_assistant`, `medication`, `medication_app`, or `meds`.

---

## 8. Mini-app actions

`action` on `mini_app_used` distinguishes real use from opening the mini-app.

| Mini-app | Example actions |
|---|---|
| Vitals | `blood_pressure_recorded`, `weight_recorded`, `heart_rate_recorded`, `blood_glucose_recorded` |
| Medication Assistant | `medication_added`, `medication_logged`, `medication_completed` |
| Checkup Planner | `checkup_created`, `checkup_completed`, `reminder_created` |
| Immunization Tracker | `immunization_added`, `immunization_viewed`, `immunization_completed` |
| Pregnancy Tracker | `pregnancy_profile_created`, `pregnancy_update_recorded`, `pregnancy_checkup_recorded` |
| Period Tracker | `period_started`, `period_ended`, `symptom_recorded` |

The action list can grow as each mini-app develops. Add an action only when it answers a product question. Current Period Tracker use is logged period days rather than explicit start/end; map the real save action to the closest `action` instead of inventing a third name.

Pregnancy daily logs, including postpartum symptom logs, are `pregnancy_update_recorded`. Do not send symptom text, bleeding amount, or other clinical detail in the event. Categorical metadata is enough.

---

## 9. Main CareMate features

### Emergency Profile

| Event |
|---|
| `emergency_profile_viewed` |
| `emergency_profile_completed` |
| `emergency_profile_shared` |

Questions: how many people use it, is it mostly one-time, does it contribute to retention, and how often is it shared?

Do not send emergency medical details, contact details, or share-token contents.

### Learning

The Learn / Articles surface.

| Event | Properties |
|---|---|
| `learning_opened` | — |
| `learning_content_viewed` | `content_id`, `content_category`, `content_type` |
| `learning_content_completed` | `content_id`, `content_category`, `content_type` |

Use this to see whether Learning is an acquisition feature, an activation feature, or a recurring engagement feature. `content_id` may be a stable content key. Do not send article body text.

### Nearby

Nearby connects people to the CareMate healthcare network.

| Event | Properties |
|---|---|
| `nearby_opened` | — |
| `nearby_search` | — |
| `nearby_result_viewed` | `entity_type` |
| `nearby_entity_selected` | `entity_type` |

`entity_type` values: `provider`, `payer`, `pharmacy`, `laboratory`, `hospital`.

This answers what people are actually looking for. Do not send the search query string if it can contain a person’s name or other personal data. A categorical `entity_type` is enough for v1.

### Messaging and broadcast

| Event |
|---|
| `messaging_opened` |
| `conversation_started` |
| `message_sent` |
| `broadcast_viewed` |

Track the behavior, not the message content.

### Family

| Event |
|---|
| `family_opened` |
| `family_member_added` |
| `family_invitation_sent` |
| `family_invitation_accepted` |
| `family_member_viewed` |

Watch Family closely. It may become a major retention mechanism. Do not send invitee names, emails, or phone numbers.

### Provider discovery

Measure discovery and connection behavior, not provider inventory. The database remains the source of truth for the provider.

| Event | Properties |
|---|---|
| `provider_searched` | — |
| `provider_viewed` | `provider_id` |
| `provider_connection_started` | `provider_id` |
| `provider_connection_completed` | `provider_id` |

`provider_id` is the CareMate organization id, not a name or contact detail.

### Payer discovery

Same structure for insurers:

| Event | Properties |
|---|---|
| `payer_searched` | — |
| `payer_viewed` | `payer_id` |
| `payer_connection_started` | `payer_id` |
| `payer_connection_completed` | `payer_id` |

---

## 10. What PostHog should tell us

### Acquisition → activation

What do users do during their first session?

### Activation → retention

Which first actions are associated with D7 and D30 retention?

### Feature → retention

- Do Medication Assistant users retain better?
- Do Family users retain better?
- Does Emergency Profile use lead to repeat usage?

### Feature → feature

Which features are used together?

Example pairings to compare:

- Emergency Profile + Provider + Medication Assistant
- Learning + Period Tracker

### Frequency

Which features are used once, and which become habits? That distinction matters more than a usage leaderboard.

---

## 11. First dashboard

One primary dashboard: **CareMate Growth & Engagement**.

### A. Growth

- WAU
- MAU
- WAU / MAU

### B. Retention

- D7
- D30

Both based on `caremate_active`, from first qualifying activity.

### C. Product activity

Unique users of:

- Features overall
- Mini-apps
- Provider discovery
- Payer discovery
- Family
- Messaging
- Learning

### D. Mini-app usage

Rank Vitals, Medication Assistant, Checkup Planner, Immunization Tracker, Pregnancy Tracker, and Period Tracker by:

- Unique users
- Percentage of MAU
- Repeat usage

### E. Main feature usage

Rank Emergency Profile, Learning, Nearby, Messaging, and Family the same way.

---

## 12. Do not only look at “most used”

Reach, frequency, and retention association are three different questions.

Example:

| Feature | Unique users | Uses per user | Reading |
|---|---|---|---|
| Vitals | 100,000 | 1.2 | Greater reach |
| Medication Assistant | 60,000 | 7.5 | Stronger recurring engagement |

For every feature, look at:

- **Reach** — how many people use it?
- **Frequency** — how often do they use it?
- **Retention association** — do people who use it come back more often?

---

## 13. Priority analyses

Run these once there is enough usage data. Do not change the retention definition to fit the result.

### 13.1 D30 retention by first meaningful feature

| First meaningful feature | D30 retention |
|---|---|
| Emergency Profile | — |
| Learning | — |
| Nearby | — |
| Messaging | — |
| Family | — |
| Vitals | — |
| Medication Assistant | — |
| Checkup Planner | — |
| Immunization Tracker | — |
| Pregnancy Tracker | — |
| Period Tracker | — |

This may show that the feature we treat as the core experience is not the one that creates the strongest relationship.

### 13.2 D30 retention by feature used in the first 7 days

Not only “what did they do first,” but “what did retained users do in week one?”

Compare, for each major feature and mini-app:

- Users who used it in the first 7 days
- Users who did not

### 13.3 Repeat usage

For every mini-app, bucket users by lifetime uses of that mini-app:

- 1 use
- 2–3 uses
- 4–10 uses
- 10+ uses

This separates discovery from adoption.

---

## 14. What not to track in v1

Do not track every button, menu, back press, scroll, animation, or screen transition unless a specific product question requires it.

Every event should answer a question. If we do not know the question, do not track the event.

---

## 15. Privacy

CareMate handles health-related information. Analytics must stay categorical.

Never send:

- Diagnoses
- Medication names
- Lab results
- Clinical notes
- Message contents
- Emergency medical details
- Personal contact information
- Full names, phone numbers, or email addresses

Prefer:

```text
mini_app = medication-tracker
action = medication_logged
```

Not:

```text
medication = [specific medication]
```

Guests may emit anonymous lifecycle events. Do not attach health actions to a person until they have a CareMate user id.

---

## 16. Implementation principle

Instrument the existing app. Do not build a separate analytics system.

```text
CareMate app
    → PostHog SDK
    → events
    → PostHog
    → funnels, retention, cohorts, trends
```

The database stays independent:

```text
CareMate app
    → CareMate backend
    → database
```

Later:

```text
PostHog + CareMate database
    → business intelligence
```

Offline delivery already exists: events enqueue in SQLite `analytics_queue` and flush when PostHog is bound and the device is online. See [Sync Engine](./SYNC_ENGINE.md) and [Data layer](./data-layer.md). New events should use that path.

---

## 17. Implementation sequence

### Phase 1 — instrumentation

- PostHog SDK and user identification (already present; extend, do not replace)
- Lifecycle events
- `caremate_active`
- Main feature events
- Mini-app events
- Provider and payer discovery events
- Family events
- Messaging events

Existing names such as `auth_sign_up`, `onboarding_complete`, and `family_request_sent` should be mapped onto this contract or aliased once. Do not emit two names for the same action.

Mobile v1 instrumentation lives in `src/lib/monitoring/product-analytics.ts` and is called from the existing screens and domain services. Overlapping lifecycle and family events use the names in this document only. `broadcast_viewed` stays defined until a broadcast surface exists. Mini-app actions without a save path (`immunization_completed`, `medication_completed`, `reminder_created`, `symptom_recorded`) are not emitted.

### Phase 2 — dashboard

- WAU, MAU, WAU / MAU
- D7, D30
- Feature usage
- Mini-app usage

### Phase 3 — analysis

- Retention by first feature
- Retention by mini-app
- Feature frequency
- Feature combinations
- First-week behavior
- Acquisition source → retention

### Phase 4 — iterate

Add an event only when the current set cannot answer a question we actually have.

---

## 18. First six months

Leadership should watch direction, not a full scorecard.

| Area | Signal |
|---|---|
| Growth | WAU up, MAU up |
| Retention | D7 up, D30 up |
| Engagement | Meaningful actions per user up |
| Discovery | More users touching more than one CareMate feature |
| Adoption | More users returning to mini-apps |
| Network | More users discovering and connecting with providers and payers |

Do not optimize all of these at once. The first months are for finding what actually creates durable use.

---

## 19. Operating principle

The database tells us what exists. PostHog tells us what people do.

For v1: do not build a custom analytics system. Instrument the product, let PostHog collect the behavioral data, and use that data to see what creates engagement and retention.

The immediate objective is not hundreds of metrics. It is:

**Who uses CareMate → what they use → what makes them return → what makes CareMate part of their health life.**
