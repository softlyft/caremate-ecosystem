# CareMate AI module (HDG)

**Source of truth:** SoftLyft `caremate-docs/CareMate_AI_Source_of_Truth.md`  
**ADR:** [`caremate-mobile/docs/adr/007-caremate-ai.md`](../../caremate-mobile/docs/adr/007-caremate-ai.md)

## Role

NestJS library inside the Health Data Gateway that owns CareMate AI HTTP APIs, LangGraph orchestration, OpenAI calls, rate limits, and persistence to parallel `ai_*` tables (Supabase service role). It does **not** mix with `libs/messages` conversation tables.

## Phase 1 routes (implemented)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/v1/ai/conversations` | Bearer JWT | Create |
| `GET` | `/v1/ai/conversations` | Bearer JWT | List for subject |
| `GET` | `/v1/ai/conversations/:id` | Bearer JWT | History |
| `POST` | `/v1/ai/conversations/:id/messages` | Bearer JWT | Body: `content`, optional `clientRequestId` (idempotent). Lifecycle: user `pending` → `complete` \| `failed`; assistant `complete` \| `refused`. Concurrent same-key retries: one request claims the turn (`processing_claimed_at`); peers wait for the result or receive `409 ai_turn_processing`. |
| `POST` | `/v1/ai/messages/:id/feedback` | Bearer JWT | Feedback |
| `DELETE` | `/v1/ai/conversations/:id` | Bearer JWT | Soft-delete (`retention_state=deleted`) |

## Layout

```
libs/ai/
  ai.module.ts
  ai.controller.ts
  ai.service.ts
  graph/education-graph.ts   # LangGraph StateGraph + ChatOpenAI + bounded history
  safety/policy.ts           # Multi-signal safety + strict health-only scope gate
  dto/ai.dto.ts
```

## Config

| Env | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | Server-only |
| (optional) `OPENAI_MODEL` | Default `gpt-4o-mini` |
| (optional) `AI_HISTORY_MAX_MESSAGES` | Prior turns fetched/kept for generate (default `16`) |
| (optional) `AI_HISTORY_MAX_CHARS` | Prior-turn character budget (default `8000`) |
| Existing | `SUPABASE_*`, `SUPABASE_JWT_SECRET`, `GATEWAY_MASTER_KEY` |

Update SAM/`template.yaml` env when wiring production.

## Constraints

- Lambda **45s** timeout; mobile client **40s**; OpenAI call hard-capped at **20s** (`MODEL_REQUEST_TIMEOUT_MS`, no retries). Timeouts/provider errors mark the user turn `failed` and return 504/503. Phase 1 stays buffered (non-streaming).
- **Conversation context:** load a bounded prior history into generate so follow-ups resolve. The DB query is newest-first with `limit` = message budget (default 16); rows are reversed to chronological order, decrypted, then trimmed to the char budget (default ~8k). Override with `AI_HISTORY_MAX_MESSAGES` / `AI_HISTORY_MAX_CHARS`. Safety classifies the current turn, but short health follow-ups (“which is best?”, “tell me more”) are allowed when prior turns already carry a health signal.
- **Message lifecycle:** insert user as `pending`; **claim** the turn via `ai_try_claim_user_message` (lease on `processing_claimed_at`) before any model call. The whole post-claim path (history load, model, encrypt, persist) is one failure domain: any error calls `ai_fail_user_turn`. Success uses transactional `ai_complete_user_turn` (assistant insert + user `complete` + clear lease). `ai_recover_stale_pending_turns` on read/send heals orphan “assistant done / user pending” rows and fails pendings older than ~120s with no usable assistant. `clientRequestId` + `parent_message_id` keep retries idempotent; the claim prevents duplicate OpenAI calls under concurrency.
- No patient PHI tools in Phase 1 graph nodes.
- **At-rest encryption:** `title` / `content` / feedback `comment` use the same HDG field cipher as messaging (owner DEK). Decrypt only in HDG. OpenAI still receives plaintext for generation — contractual retention/training controls apply.
- Tables are **service_role only** (no authenticated PostgREST grants).
- Log/metrics: no message bodies in routine logs; store token usage on `ai_message`.
- Rate limit: 5 / 24h / user and burst ~5 / minute via atomic `ai_consume_rate_limit` (advisory lock + `ai_rate_reservation`). Same `clientRequestId` is idempotent; a new id after failure consumes another slot.
- Retention: user delete soft-archives; account deletion scrubs `ai_*` (see delete-account).

## Later phases

- Phase 2: retrieval node + `ai_message_source`
- Phase 3: allowlisted tool nodes calling existing HDG PHI services with authz
- Streaming: only after explicit SoT change (Lambda response streaming or alternate pattern)
