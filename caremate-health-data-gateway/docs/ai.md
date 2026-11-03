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
| `POST` | `/v1/ai/conversations/:id/messages` | Bearer JWT | Full assistant reply in body (buffered) |
| `POST` | `/v1/ai/messages/:id/feedback` | Bearer JWT | Feedback |
| `DELETE` | `/v1/ai/conversations/:id` | Bearer JWT | Soft-delete (`retention_state=deleted`) |

## Layout

```
libs/ai/
  ai.module.ts
  ai.controller.ts
  ai.service.ts
  graph/education-graph.ts   # LangGraph StateGraph + ChatOpenAI
  safety/policy.ts           # Multi-signal safety (negation/context, emergency, meds)
  dto/ai.dto.ts
```

## Config

| Env | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | Server-only |
| (optional) `OPENAI_MODEL` | Default `gpt-4o-mini` |
| Existing | `SUPABASE_*`, `SUPABASE_JWT_SECRET`, `GATEWAY_MASTER_KEY` |

Update SAM/`template.yaml` env when wiring production.

## Constraints

- Lambda **30s** timeout — keep Phase 1 non-streaming and model calls bounded.
- No patient PHI tools in Phase 1 graph nodes.
- **At-rest encryption:** `title` / `content` / feedback `comment` use the same HDG field cipher as messaging (owner DEK). Decrypt only in HDG. OpenAI still receives plaintext for generation — contractual retention/training controls apply.
- Tables are **service_role only** (no authenticated PostgREST grants).
- Log/metrics: no message bodies in routine logs; store token usage on `ai_message`.
- Rate limit: 30 messages / 24h / user; burst ~5 / minute.
- Retention: user delete soft-archives; account deletion scrubs `ai_*` (see delete-account).

## Later phases

- Phase 2: retrieval node + `ai_message_source`
- Phase 3: allowlisted tool nodes calling existing HDG PHI services with authz
- Streaming: only after explicit SoT change (Lambda response streaming or alternate pattern)
