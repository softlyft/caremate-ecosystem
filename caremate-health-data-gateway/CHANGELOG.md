# Changelog

All notable changes to the CareMate Health Data Gateway (HDG) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
via `package.json` (`caremate-health-data-gateway`).

HDG versions independently of mobile and the portals. Prefer git tags like `hdg-v0.1.0`.

## [Unreleased]

### Fixed
- Concurrent retries with the same `clientRequestId` no longer double-call the model: exclusive `processing_claimed_at` lease via `ai_try_claim_user_message`; peers wait for the finished turn or receive `409 ai_turn_processing`. Finished assistant rows are not overwritten by a racing writer.
- Post-claim failures (history decrypt, encrypt, persist, etc.) no longer leave user turns stuck in `pending`: full-turn try/fail via `ai_fail_user_turn`, transactional `ai_complete_user_turn`, and `ai_recover_stale_pending_turns` on send/read (~120s).
- Prior-history load for the model is bounded at the DB (`order created_at desc` + `limit`), not only after decrypt; budgets via `AI_HISTORY_MAX_MESSAGES` / `AI_HISTORY_MAX_CHARS`.

## [0.1.0] — 2026-11-06

Initial documented baseline for the NestJS trust layer (field-level PHI encryption + gateway APIs).

### Added

#### Platform
- NestJS API with JWT auth and Supabase service-role access
- Per-user DEK bootstrap (`POST /v1/crypto/bootstrap`) and master-key encryption
- Liveness (`GET /health`)
- Lambda packaging scripts for AWS deploy

#### PHI surfaces
- Profile encrypt / decrypt (`PUT` / `GET /v1/profile`)
- Emergency profile encrypt / decrypt (`PUT` / `GET /v1/emergency`)
- Mini-app snapshot PHI leaves (`PUT` / `GET /v1/mini-app-snapshots`)
- Family member PHI under household owner DEK (`/v1/family/members`)
- Messages encrypt / decrypt / reply / seal (`/v1/messages/*`)
- Documents title / file-name encrypt / decrypt (`/v1/documents`)

#### CareMate AI (Phase 1)
- Conversation CRUD + messaging under `/v1/ai/*`
- LangGraph education graph, safety / health-scope gate, daily rate limit
- Message feedback endpoint; soft-delete retention
- Transcript fields encrypted with the same PHI pattern as other HDG surfaces

[0.1.0]: https://github.com/softlyft/caremate-ecosystem/releases/tag/hdg-v0.1.0
