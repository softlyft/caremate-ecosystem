-- CareMate AI message lifecycle + idempotency for retries.
-- Status already: pending | complete | failed | refused (see 20261103170000).

alter table public.ai_message
  add column if not exists client_request_id uuid;

alter table public.ai_message
  add column if not exists parent_message_id uuid
    references public.ai_message (id) on delete cascade;

comment on column public.ai_message.client_request_id is
  'Client-generated idempotency key for user turns; retries reuse the same id.';
comment on column public.ai_message.parent_message_id is
  'Assistant message points at the user message it answers (one assistant per user turn).';

-- One user turn per client request within a conversation.
create unique index if not exists ai_message_conversation_client_request_uidx
  on public.ai_message (conversation_id, client_request_id)
  where client_request_id is not null;

-- At most one assistant reply per user message.
create unique index if not exists ai_message_parent_assistant_uidx
  on public.ai_message (parent_message_id)
  where parent_message_id is not null and role = 'assistant';
