-- CareMate AI: parallel conversation tables (not message_conversations).
-- Phase 1: general health education only. See caremate-docs/CareMate_AI_Source_of_Truth.md

create table if not exists public.ai_conversation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  retention_state text not null default 'active'
    check (retention_state in ('active', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversation_user_updated_idx
  on public.ai_conversation (user_id, updated_at desc)
  where retention_state = 'active';

create table if not exists public.ai_message (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversation (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  status text not null default 'complete'
    check (status in ('pending', 'complete', 'failed', 'refused')),
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  safety_state text not null default 'ok'
    check (safety_state in ('ok', 'refused', 'emergency', 'escalated')),
  created_at timestamptz not null default now()
);

create index if not exists ai_message_conversation_created_idx
  on public.ai_message (conversation_id, created_at);

create table if not exists public.ai_message_source (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ai_message (id) on delete cascade,
  source_type text not null default 'knowledge',
  source_id text,
  title text,
  url text,
  retrieved_at timestamptz,
  version text,
  created_at timestamptz not null default now()
);

create index if not exists ai_message_source_message_idx
  on public.ai_message_source (message_id);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ai_message (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  category text,
  comment text,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.ai_safety_event (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversation (id) on delete set null,
  message_id uuid references public.ai_message (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  category text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  action text not null,
  policy_version text,
  reviewed_status text not null default 'open'
    check (reviewed_status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists ai_safety_event_created_idx
  on public.ai_safety_event (created_at desc);

comment on table public.ai_conversation is
  'CareMate AI threads — separate from message_conversations (human/org chat).';
comment on table public.ai_message is
  'CareMate AI messages; Phase 1 education-only content.';

alter table public.ai_conversation enable row level security;
alter table public.ai_message enable row level security;
alter table public.ai_message_source enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_safety_event enable row level security;

-- Owner read/write via authenticated role (HDG uses service role and still enforces ownership in app code).
drop policy if exists ai_conversation_owner_all on public.ai_conversation;
create policy ai_conversation_owner_all
  on public.ai_conversation
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists ai_message_owner_all on public.ai_message;
create policy ai_message_owner_all
  on public.ai_message
  for all
  to authenticated
  using (
    exists (
      select 1 from public.ai_conversation c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversation c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists ai_message_source_owner_select on public.ai_message_source;
create policy ai_message_source_owner_select
  on public.ai_message_source
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.ai_message m
      join public.ai_conversation c on c.id = m.conversation_id
      where m.id = message_id and c.user_id = auth.uid()
    )
  );

drop policy if exists ai_feedback_owner_all on public.ai_feedback;
create policy ai_feedback_owner_all
  on public.ai_feedback
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Safety events: owners can read their own; inserts via service role / HDG.
drop policy if exists ai_safety_event_owner_select on public.ai_safety_event;
create policy ai_safety_event_owner_select
  on public.ai_safety_event
  for select
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.ai_conversation to authenticated;
grant select, insert, update, delete on public.ai_message to authenticated;
grant select on public.ai_message_source to authenticated;
grant select, insert, update, delete on public.ai_feedback to authenticated;
grant select on public.ai_safety_event to authenticated;
