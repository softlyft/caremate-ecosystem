# Community Portal — Data Model

See `supabase/migrations/20260721100000_community_portal_phase1.sql` and
`20260721113000_community_join_patient_verification.sql`.

## Core entities

| Table | Purpose |
|-------|---------|
| `profiles` | Canonical CareMate patient identity; read by Community, never copied |
| `community_join_verifications` | Short-lived hashed enrollment codes and sessions |
| `community_chapters` | Local chapter with required country + flexible JSONB administrative hierarchy |
| `community_memberships` | User ↔ admin-created chapter with role and status |
| `community_events` | Chapter events |
| `community_event_registrations` | RSVP + attendance |
| `community_announcements` | Chapter updates |
| `community_resources` | Downloadable files |
| `community_badges` / `community_certificates` | Recognition catalog |
| `community_user_badges` / `community_user_certificates` | Awards |
| `community_contributions` | Manual point records (Phase 1) |
| `community_notifications` | In-app notifications |
| `community_gallery_items` | Chapter photo gallery |

## Chapter geography

Country is required and relational (`community_chapters.country_code`). Lower administrative levels
vary by country:

- `community_countries.administrative_level_config` is an ordered JSONB array of field definitions
  (optional `depends_on` for cascading parents).
- `community_countries.administrative_options` stores fixed selectable values: top-level keys are
  level keys; parent levels use `string[]`, dependent levels map `parentValue → string[]`.
- `community_chapters.administrative_hierarchy` is a JSONB object containing the chapter's optional values.

Example for Nigeria:

```json
{
  "state": "Lagos",
  "local_government": "Ikeja"
}
```

Nigeria is configured as State → Local Government Area; Ghana as Region → District; Kenya as
County → Sub-county; South Africa as Province → District Municipality → Local Municipality; and
Egypt as Governorate → District. SoftLyft admins pick from cascading fixed options (for example
Nigeria State → LGAs of that state) or choose **Other** to type a custom value. Chapters can be
updated later without changing the table schema. The GIN index supports containment matching for
future member-to-chapter recommendations.

The earlier `community_states` / `community_cities` tables and nullable chapter foreign keys remain
for backward compatibility; new chapter create/update uses the JSONB hierarchy.

## Leaderboard

View `community_leaderboard_points` aggregates contribution points by user/chapter/country.

MVP supports chapter and national (country) leaderboards only.
