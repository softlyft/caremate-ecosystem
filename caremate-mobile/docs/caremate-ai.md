# CareMate AI (mobile)

[← Back to index](./README.md)

**Source of truth:** SoftLyft `caremate-docs/CareMate_AI_Source_of_Truth.md`  
**Decision record:** [ADR-007](./adr/007-caremate-ai.md)  
**Gateway:** [HDG AI module](../../caremate-health-data-gateway/docs/ai.md)

## Product summary

Pinned **CareMate AI** at the top of the Messages inbox. Dedicated AI conversation UI. Phase 1 answers **general health education** questions only — not personal chart Q&A, not diagnosis/prescribing.

## Mobile responsibilities (Phase 1)

| Area | Behaviour |
|------|-----------|
| Inbox | Stable pin above human/org threads; clear AI identity (not a provider chat) |
| Thread | Load/create conversation via HDG; send message; show waiting/typing until full reply returns |
| Feedback | Optional thumbs / category on assistant messages |
| Delete | User can delete an AI conversation (HDG delete API) |
| Analytics | PostHog events per SoT — **never** message text or health identifiers |
| Offline | Phase 1: require network for AI (no offline model). Mirror existing “need connection” patterns |

## Non-goals for mobile Phase 1

- Streaming tokens in the UI
- Attaching vitals/meds/documents into the prompt
- Reusing `experimental/ai` screens or insight engines
- Writing into `message_conversations`

## Phase 1 implementation status

Shipped in-repo (needs migration deploy + `OPENAI_API_KEY` on HDG):

1. Domain client: `src/domains/ai/`
2. Inbox pin + `messages/ai` thread
3. PostHog events in [product-analytics.ts](../src/lib/monitoring/product-analytics.ts) / [posthog-analytics.md](./posthog-analytics.md)
4. HDG `libs/ai` + Supabase `ai_*` migration `20261103170000_caremate_ai.sql`

## Phases (short)

| Phase | Mobile focus |
|-------|----------------|
| 1 | Pin, thread, buffered replies, feedback, safety copy |
| 2 | Show citations / sources on answers |
| 3 | Consent UX + personal-context questions |
| 4+ | Document Q&A, family context |

See the SoT for exit gates and non-goals.
