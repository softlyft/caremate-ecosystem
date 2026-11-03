# ADR-007: CareMate AI (HDG module, parallel tables, OpenAI + LangGraph)

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-11-03 |

## Context

We are adding a conversational health-education companion in the patient app. The planning proposal suggested a generic “AI service” and optional FastAPI stack. CareMate already runs **Expo mobile**, **Supabase**, and a **NestJS Health Data Gateway** (Lambda, 30s timeout) for authenticated PHI and messaging APIs. We need durable choices for where AI runs, how conversations are stored, and which model stack to use — without mixing AI into human/org messaging.

Full product SoT: SoftLyft `caremate-docs/CareMate_AI_Source_of_Truth.md` (and [caremate-ai.md](../caremate-ai.md)).

## Decision

1. **Runtime:** Implement CareMate AI as a **NestJS library/module inside HDG** (`libs/ai`), same JWT auth pattern as existing `/v1/*` routes.
2. **Storage:** Persist AI data in **parallel `ai_*` tables** in Supabase Postgres. Do **not** add an `ai_assistant` kind to `message_conversations`. Tables are **HDG service_role only** — no authenticated PostgREST grants (prevents bypassing rate limits / safety / orchestration). Free-text (`title`, `content`, feedback `comment`) is **encrypted at rest** with the owner DEK via HDG (same envelope as messaging). Decrypt only in HDG; OpenAI still receives plaintext for generation.
3. **UX entry:** Pin a CareMate AI row at the **top of the Messages inbox**; use a **dedicated AI thread** screen and data client (may reuse chat UI patterns only).
4. **Orchestration:** **OpenAI API** behind a provider interface; orchestration with **LangGraph.js (StateGraph)** in the HDG module.
5. **Phase 1 transport:** **Buffered REST** — one HTTP request returns the full assistant message (no SSE). Lambda **45s**, client **~40s**, model hard cap **20s**; timeouts fail the turn cleanly (no streaming in Phase 1).
6. **Phase 1 model:** **`gpt-4o-mini`**; rate limits and token metadata as in the SoT.
7. **Prior art:** Do **not** port `experimental/ai` Personal Health Assistant code.
8. **Phase 1 scope:** General health education only — no patient-record tools in the model context.
9. **Clinical safety:** Owned by **CareMate Health Champions** (clinician community users), with a SoftLyft-designated Champions lead for pilot go/no-go — see SoT §7.

## Consequences

- Mobile calls HDG `/v1/ai/*` with the user JWT; AI schema migrations live under root `supabase/migrations/`.
- Account deletion must scrub `ai_*` alongside other personal data.
- Token streaming, RAG, and personalisation are later phases; each needs an SoT update if they change these decisions.
- HDG Lambda env gains `OPENAI_API_KEY` (and related config); never ship the key in the mobile app.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Extend `message_conversations` with AI kind | Couples AI to org/DM PHI encryption, participants, and provider inbox semantics |
| Separate FastAPI AI service | Extra deploy/auth surface; team already operates Nest HDG |
| Edge Function–only orchestration | Weak fit for LangGraph, long prompts, and cost/control vs HDG |
| SSE / Lambda response streaming in Phase 1 | Not on current HDG template; 30s timeout; education UX acceptable with wait indicator |
| Reuse `experimental/ai` | Rule-based insights only; not the agreed architecture |
