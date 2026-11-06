# Changelog

All notable changes to the CareMate Care Portal (provider / payer) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
via `package.json` (`caremate-provider-portal`).

Versions independently of mobile, HDG, and other portals. Prefer git tags like `provider-portal-v0.1.0`.

## [Unreleased]

<!-- Add entries here as they merge to main; move into a version section at release. -->

## [0.1.0] — 2026-11-06

Initial documented MVP baseline for the provider / payer engagement portal.

### Added

#### Auth & org identity
- Organization claim flow with email OTP verification
- Staff login and RBAC for claimed orgs
- Org profile + claim-time verification badge

#### Connections
- Patient ↔ provider connections by CareMate Patient ID (approve / reject)
- Provider ↔ payer connections (verified orgs; portal inbox)
- Patient ↔ payer connection support surfaces for the mobile Health Insurance Directory
- Mark connected CareMate users as organization staff

#### Engagement
- Org ↔ patient messaging (compose + two-way threads; push via Edge Functions)
- Private Care Team seats (plan-gated) for staff ↔ patient DMs
- Secure document upload / share to patients (in-app + push)
- Appointment scheduling (availability, staff schedule, request queue, check-in)

#### Payer workspace
- `/payer/*` surfaces for org profile, connections, documents, and messages
- Payer Support Team checkout handoff to the payment host

#### Plans
- Private Care Team Paystack plans via hosted payment gateway (not direct Edge calls from the portal)

[0.1.0]: https://github.com/softlyft/caremate-ecosystem/releases/tag/provider-portal-v0.1.0
