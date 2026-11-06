# Changelog

All notable changes to the CareMate mobile app are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
for the marketing version in `app.json` (`expo.version`).

Store **build numbers** (iOS `CFBundleVersion`, Android `versionCode`) increment
automatically in CI and are separate from this marketing version — see
[Mobile release](./docs/mobile-release.md).

## [Unreleased]

<!-- Add entries here as they merge to main; move into a version section at release. -->

## [1.0.0] — 2026-11-06

First public App Store / Play store release. Scope matches what ships on the
**`prod`** branch (CareMate AI is **not** included in this release).

### Added

#### Core experience
- Guest-first launch: browse Home, Learn, Nearby, and Emergency without an account
- Email/password registration and sign-in (Supabase Auth), with local session restore
- In-app **Delete account** (Settings) with server deidentification and local wipe
- Offline-first data: SQLite on device, background sync to Supabase when online
- Home feed: daily tip, featured articles/news, nearby providers preview, emergency CTA
- Global search across articles, providers, and health tools
- Localization preferences (language / country) with multi-language UI strings

#### Learn
- Evergreen health articles (categories, bookmarks, reading history)
- Currents health news (international + country slots; short retention window)
- Mark-as-reading / mark-as-read with sync for signed-in users

#### Nearby & care discovery
- Nearby provider discovery with location permission flow and favorites
- Provider detail and connection flows toward care organizations

#### Emergency
- Emergency health profile (view / edit) with offline access
- Share / lock-card style surfaces for critical info when needed

#### Family
- Family household setup (children + invited adults)
- Plan-based child and invite caps (Free / Standard / Family Premium)

#### Mini-apps (Apps tab; signed-in)
- Medication Assistant (free-tier active medication cap)
- Checkup Planner (free-tier visibility / Premium unlock)
- Immunization Tracker (multi-child; Premium unlock depth)
- Pregnancy Tracker
- Period Tracker
- Vitals Tracker

#### Premium & monetization
- Free, Standard Premium, and Family Premium plan matrix
- In-app Premium via **Apple In-App Purchase** / **Google Play Billing** (`expo-iap`)
- Entitlement sync into local SQLite for offline plan gates
- AdMob banners on free tier (suppressed for Premium where configured)
- House / sponsored ad slots with portal-managed catalog

#### Messaging & notifications
- In-app messaging with connected care parties (patient ↔ org)
- Notification inbox with deep links into related screens
- Push notification plumbing (device registration)

#### Community & profile
- Profile and settings (including notification preferences)
- CareMate Community Network join entry from Me
- Insurance / payer connection surfaces where configured

#### Platform & operations
- GitHub Actions release pipelines: TestFlight (`main`), App Store / Play (`prod`)
- Sentry crash reporting and PostHog product analytics (env-gated)
- At-rest encryption for sensitive local fields (SQLCipher / secure storage patterns)

### Notes for store “What’s New”
Suggested short copy for App Store Connect / Play Console:

> Welcome to CareMate 1.0 — your offline-friendly health companion. Learn health topics, track medications, pregnancy, periods, immunizations and more, find nearby care, keep an emergency profile, manage family profiles, and unlock Premium tools when you need them.

[1.0.0]: https://github.com/softlyft/caremate-ecosystem/releases/tag/mobile-v1.0.0
