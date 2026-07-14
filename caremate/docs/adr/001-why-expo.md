# ADR-001: Why Expo

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-07-13 |

## Context

CareMate is a **mobile-first** healthcare app that must ship on iOS and Android, support offline-capable native modules (SQLite, secure storage, biometrics, background sync, widgets), and stay maintainable with a small team. We needed a shared React Native toolchain with predictable native builds and a clear docs/version story for agents and humans.

## Decision

Build CareMate with **Expo SDK 57** (React Native) using:

- Expo Router for navigation
- Continuous Native Generation / `expo run:*` for development builds where config plugins are required
- Version-pinned Expo module docs (`docs.expo.dev/versions/v57.0.0/`) as the authority for native APIs

Web (Expo web) is supported for convenience, not as the primary product surface.

## Consequences

- One TypeScript codebase targets iOS and Android with shared UI and business logic.
- Native capabilities are added through Expo modules and config plugins (`expo-sqlite`, `expo-secure-store`, `expo-background-task`, widgets, etc.).
- Agents and contributors must follow SDK **57** docs — Expo APIs change across majors (`AGENTS.md`).
- Some packages require a **dev client / prebuild**, not Expo Go alone (background tasks, custom widget module).
- App Store / Play delivery still needs EAS or local release builds; Expo does not remove store process.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Bare React Native CLI only | More native boilerplate and upgrade churn for little gain at Phase 1–2 |
| Flutter | Team skill and ecosystem preference is React/TypeScript; CareMate docs/code already assume RN |
| Separate native iOS/Android apps | Double cost; conflicts with offline-first shared data model |
| Web-only PWA | Unreliable offline health data, lock/home widgets, and store distribution for the target users |
