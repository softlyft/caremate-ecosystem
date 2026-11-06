# Changelog

All notable changes to the SoftLyft CareMate admin portal are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
via `package.json` (`caremate-admin-portal`).

Versions independently of mobile, HDG, and other portals. Prefer git tags like `admin-portal-v0.1.0`.

## [Unreleased]

<!-- Add entries here as they merge to main; move into a version section at release. -->

## [0.1.0] — 2026-11-06

Initial documented baseline for SoftLyft staff operations.

### Added

#### Auth & governance
- Staff authentication with role-based access control
- Admin audit event writes and browse UI (`/dashboard/audit`)

#### Catalogs & content
- Learn evergreen article management
- Health tip management
- External / Currents health news workflows
- Provider catalog upload, archive, and FHIR view workflows
- Media / asset workflows for content surfaces

#### Users & billing
- User administration
- Premium price management (plan matrix)
- Subscriber and transaction visibility
- Admin entitlement grants

#### Ads
- Per-slot source modes (`off` \| `house` \| `sponsored` \| `admob`), including mini-app slots
- Advertiser verification
- House and sponsored campaign CRUD (`/dashboard/ads`)

#### Community Network oversight
- Chapters, members, recognition awards, and reports under `/dashboard/community/*`

[0.1.0]: https://github.com/softlyft/caremate-ecosystem/releases/tag/admin-portal-v0.1.0
