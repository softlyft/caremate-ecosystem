# CareMate - Engineering Implementation Guide (v1)

> **Project Goal:** Build CareMate, an offline-first, patient-centric mobile healthcare application using React Native + Expo and Supabase. The architecture must prioritize developer productivity, scalability, and future healthcare integrations while keeping the MVP simple.

---

# 1. Core Engineering Principles

These principles are **non-negotiable**.

## Mobile First

The mobile application is the primary product.

Every engineering decision should optimize the mobile experience first.

---

## Offline First

SQLite is the **source of truth on the device.**

The UI **never communicates directly with Supabase**.

Instead:

```
UI
↓
Repository
↓
SQLite
↓
Sync Engine
↓
Supabase
```

The application must remain functional without internet connectivity.

---

## Repository Pattern

Every feature owns its own repository.

Example:

```
EmergencyRepository

ProviderRepository

ArticleRepository

AuthRepository
```

Repositories abstract the data source.

The UI should never know whether data came from SQLite or Supabase.

---

## Backend Philosophy

For Phase 1 and Phase 2:

- No custom backend.
- Use Supabase directly.
- Use Supabase Edge Functions for privileged operations.

NestJS will be introduced in Phase 3 for:

- FHIR
- Hospital integrations
- Laboratory integrations
- Pharmacy integrations
- Insurance
- AI orchestration
- Event processing

Do not build anything assuming NestJS already exists.

---

# 2. Tech Stack

## Mobile

- React Native
- Expo
- TypeScript
- Expo Router

## UI

- Gluestack UI

## State

- Zustand (UI state only)

Never store server collections in Zustand.

Use Zustand for:

- Authentication
- Theme
- Settings
- Current Profile
- Notification Preferences

## Server State

- TanStack Query

Responsibilities:

- Queries
- Mutations
- Cache
- Optimistic Updates

## Forms

- React Hook Form
- Zod

## Local Database

- Expo SQLite

Recommended ORM:

- Drizzle ORM

## Authentication

Supabase Auth

Support:

- Email
- Phone
- Google
- Apple
- Biometrics

## Storage

Supabase Storage

## Database

Supabase PostgreSQL

## Notifications

- Expo Notifications
- Firebase Cloud Messaging

## Analytics

PostHog

## Error Monitoring

Sentry

---

# 3. Folder Structure

```
src/

 app/

 components/

 features/

    auth/

    emergency/

    articles/

    providers/

    profile/

    family/

    notifications/

 database/

 repositories/

 services/

 sync/

 hooks/

 constants/

 types/

 utils/

 theme/

 lib/
```

Feature-first architecture is mandatory.

---

# 4. Feature Modules (Phase 1)

Implement the following modules.

## Authentication

Features

- Login
- Register
- Forgot Password
- Session Management
- Biometric Unlock

---

## Emergency Profile

Fields

- Full Name
- Photo
- Blood Group
- Genotype
- Allergies
- Current Medications
- Chronic Conditions
- Emergency Contacts
- Preferred Hospital
- Insurance Provider
- Notes

Requirements

- Offline available
- QR code generation
- Emergency mode

---

## Health Articles

Features

- Categories
- Bookmark
- Search
- Offline caching
- Subscribe to categories

---

## Provider Discovery

Support

- Hospitals
- Clinics
- Pharmacies
- Laboratories
- Dentists
- Mental Health
- Ambulance
- Blood Banks

Features

- Nearby search
- Filters
- Favorites
- Details
- Directions

---

## Profile

Features

- Personal information
- Preferences
- Notification settings
- Theme

---

# 5. Offline Architecture

## SQLite

SQLite is the local source of truth.

Every feature owns local tables.

Examples

```
profiles

emergency_profiles

providers

articles

bookmarks

settings

sync_queue

sync_metadata
```

---

# 6. Synchronization Engine

Create a dedicated sync module.

Responsibilities

- Network detection
- Queue writes
- Retry failed operations
- Background sync
- Pull latest server changes
- Update SQLite

Never allow UI to wait for synchronization.

---

## Sync Flow

```
User Action

↓

Repository

↓

SQLite

↓

UI Updates Immediately

↓

Queue Sync

↓

Background Upload

↓

Supabase

↓

Mark Complete
```

---

# 7. Repository Pattern

Every feature implements

```
Repository

↓

SQLite

↓

Sync Queue

↓

Supabase
```

Example

```
EmergencyRepository

save()

update()

delete()

sync()

findById()

findAll()
```

---

# 8. State Management

## Zustand

Use only for

- Auth
- Theme
- Settings
- Current User
- Current Profile

Do not store API data.

---

## TanStack Query

Use for

- Articles
- Providers
- User Profile
- Notifications

TanStack Query should hydrate from SQLite where appropriate and coordinate background refreshes through repositories.

---

# 9. Security

Store tokens using

- Expo SecureStore

Never use AsyncStorage for secrets.

Support

- Biometrics
- Auto Logout
- Device Authentication

---

# 10. Supabase

Use

- Auth
- PostgreSQL
- Storage
- Realtime
- Edge Functions

Do not introduce custom backend APIs.

---

# 11. Edge Functions

Use only when server-side execution is required.

Examples

- AI requests
- QR generation (if needed)
- Emails
- Push notifications
- Scheduled jobs
- Third-party APIs
- Payment webhooks

---

# 12. Coding Standards

Use

- TypeScript Strict Mode
- ESLint
- Prettier

Follow

- SOLID
- Repository Pattern
- Dependency Injection where appropriate
- Feature-first organization

Avoid

- God Components
- Massive Screens
- Business logic inside UI

---

# 13. UI Principles

Every screen should

- Support loading state
- Support empty state
- Support offline state
- Support error state

The app should feel usable regardless of network availability.

---

# 14. Phase 1 Screens

Authentication

- Splash
- Onboarding
- Login
- Register

Home

- Dashboard
- Emergency Card
- Health Feed
- Categories

Emergency

- View
- Edit
- QR Code

Providers

- List
- Details
- Map

Articles

- Feed
- Category
- Detail
- Bookmarks

Profile

- Account
- Settings

---

# 15. Future Phases (Do Not Implement Yet)

Phase 2

- Family Profiles
- Medication Tracking
- Vaccination Records
- Appointment Scheduling
- Medical Documents
- Reminder Engine

Phase 3

- Provider Portal
- NestJS Integration Service
- FHIR
- Hospital APIs
- Laboratory APIs
- Pharmacy APIs
- Consent Management

Phase 4

- Telemedicine
- AI Assistant
- Apple Health
- Health Connect
- Insurance
- Payments
- Wearables

---

# 16. Success Criteria

The MVP is complete when users can:

- Create an account
- Authenticate securely
- Manage an emergency health profile
- Access emergency information offline
- Browse and search health articles
- Discover nearby healthcare providers
- Continue using core features without internet
- Automatically synchronize data when connectivity returns

---

# 17. Cursor Development Instructions

When generating code:

1. Prefer reusable, modular components.
2. Follow the folder structure exactly.
3. Build one feature at a time.
4. Keep business logic inside repositories/services.
5. Keep screens focused on presentation.
6. Every feature must support offline mode by design.
7. Write strongly typed TypeScript.
8. Create interfaces before implementations.
9. Avoid unnecessary abstractions.
10. Leave clear extension points for Phase 2 and Phase 3 without implementing them prematurely.

**Primary objective:** Build a clean, production-quality MVP that can evolve into a full healthcare ecosystem without requiring architectural rewrites.
