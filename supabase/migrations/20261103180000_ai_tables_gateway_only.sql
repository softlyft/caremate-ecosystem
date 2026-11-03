-- CareMate AI writes/reads go only through HDG (service_role).
-- Authenticated clients must not bypass rate limits, safety policy, or orchestration.

revoke all on public.ai_conversation from authenticated;
revoke all on public.ai_message from authenticated;
revoke all on public.ai_message_source from authenticated;
revoke all on public.ai_feedback from authenticated;
revoke all on public.ai_safety_event from authenticated;

-- Drop owner policies that assumed direct authenticated access.
drop policy if exists ai_conversation_owner_all on public.ai_conversation;
drop policy if exists ai_message_owner_all on public.ai_message;
drop policy if exists ai_message_source_owner_select on public.ai_message_source;
drop policy if exists ai_feedback_owner_all on public.ai_feedback;
drop policy if exists ai_safety_event_owner_select on public.ai_safety_event;

-- RLS stays on; with no grants to authenticated, PostgREST cannot touch these tables.
-- service_role (HDG) bypasses RLS as usual.

comment on table public.ai_conversation is
  'CareMate AI threads — HDG service_role only; not mixed with message_conversations.';
comment on table public.ai_message is
  'CareMate AI messages — HDG service_role only; Phase 1 education-only content.';
