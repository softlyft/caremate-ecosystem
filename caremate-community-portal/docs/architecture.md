# Community Portal — Architecture

Next.js 15 App Router portal for CareMate Community Network contributors.

## Layout

```
src/
├── app/
│   ├── login/          Public sign-in (existing CareMate account)
│   ├── join/           Patient ID verification + chapter selection
│   └── app/            Protected member area
├── domains/            Server actions + repositories
├── components/         App shell, UI primitives
├── features/           Client forms (login, join)
├── lib/                Auth, Supabase clients
└── constants/          Roles, categories, points
```

## Auth & enrollment flow

1. Only registered CareMate app users can enroll (lookup by `profiles.patient_id`).
2. `/join` starts a short-lived verification challenge; the six-digit code is emailed (and may be shown in the UI during MVP).
3. After verify, the user selects an **active** chapter created by SoftLyft admins.
4. Membership is created as **approved** immediately — no duplicate `community_profiles` identity row.
5. The member signs in at `/login` with the same Supabase Auth credentials as the mobile app.
6. Middleware gates `/app/*` on an approved `community_memberships` row.

Public marketing and how-to live on the website: `/ccn` and `/ccn/guide`.

## Session model

`getCommunitySession()` returns user + approved membership + active chapter (cookie `community_active_chapter`).

Leader routes require `lead` or `deputy` role on the active chapter.

## Backend

Community tables and storage buckets: `supabase/migrations/20260721100000_community_portal_phase1.sql`.

Join verification: `supabase/migrations/20260721113000_community_join_patient_verification.sql`.

Canonical identity remains `public.profiles` (including `patient_id`).

Staff admins manage chapters, awards, and reports via **caremate-admin-portal** `/dashboard/community/*`.
