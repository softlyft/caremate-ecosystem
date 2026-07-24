-- Phase C: person-to-person DMs (patient↔practitioner, practitioner↔practitioner)
-- scoped to a shared organization. Non-practitioner ↔ non-practitioner is blocked.

-- ========== Shape: direct conversations carry organization_id for ACL ==========

alter table public.message_conversations
  drop constraint if exists message_conversations_org_patient_shape;

alter table public.message_conversations
  add constraint message_conversations_kind_shape check (
    (kind = 'org_patient' and organization_id is not null and patient_user_id is not null)
    or (kind = 'direct' and organization_id is not null and patient_user_id is null)
  );

comment on table public.message_conversations is
  'Chat threads: org_patient (clinic↔patient) and direct (user↔user scoped to an org).';

-- Stable pair key so the same two users share one thread per org.
create table if not exists public.message_direct_pairs (
  conversation_id uuid primary key
    references public.message_conversations (id) on delete cascade,
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint message_direct_pairs_ordered check (user_low < user_high),
  unique (organization_id, user_low, user_high)
);

create index if not exists message_direct_pairs_user_low_idx
  on public.message_direct_pairs (user_low);
create index if not exists message_direct_pairs_user_high_idx
  on public.message_direct_pairs (user_high);

alter table public.message_direct_pairs enable row level security;

create policy "Participants read direct pairs"
  on public.message_direct_pairs for select to authenticated
  using (
    public.is_staff()
    or user_low = auth.uid()
    or user_high = auth.uid()
  );

-- DM peers need each other's display names in the mobile inbox.
create policy "Direct message peers read profiles"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.message_direct_pairs d
      where (d.user_low = auth.uid() and d.user_high = profiles.user_id)
         or (d.user_high = auth.uid() and d.user_low = profiles.user_id)
    )
  );

-- ========== Helpers ==========

create or replace function public.is_org_practitioner(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_org_members m
    where m.organization_id = p_org_id
      and m.user_id = p_user_id
      and m.deleted_at is null
  );
$$;

create or replace function public.is_linked_to_org(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_org_practitioner(p_org_id, p_user_id)
    or exists (
      select 1
      from public.patient_provider_connections c
      where c.organization_id = p_org_id
        and c.patient_id = p_user_id
        and c.status = 'approved'
    );
$$;

create or replace function public.can_direct_message(
  p_org_id uuid,
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and p_user_a <> p_user_b
    and p_org_id is not null
    and public.is_linked_to_org(p_org_id, p_user_a)
    and public.is_linked_to_org(p_org_id, p_user_b)
    and (
      public.is_org_practitioner(p_org_id, p_user_a)
      or public.is_org_practitioner(p_org_id, p_user_b)
    );
$$;

grant execute on function public.is_org_practitioner(uuid, uuid) to authenticated;
grant execute on function public.is_linked_to_org(uuid, uuid) to authenticated;
grant execute on function public.can_direct_message(uuid, uuid, uuid) to authenticated;

-- ========== RLS: participant-based access for direct threads ==========

drop policy if exists "Patients read own message conversations" on public.message_conversations;
create policy "Participants read message conversations"
  on public.message_conversations for select to authenticated
  using (
    public.is_staff()
    or patient_user_id = auth.uid()
    or (
      organization_id is not null
      and public.is_provider_org_member(organization_id)
    )
    or exists (
      select 1
      from public.message_participants p
      where p.conversation_id = message_conversations.id
        and p.party_type = 'user'
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Patients read own message participants" on public.message_participants;
create policy "Participants read message participants"
  on public.message_participants for select to authenticated
  using (
    public.is_staff()
    or user_id = auth.uid()
    or exists (
      select 1
      from public.message_conversations c
      where c.id = conversation_id
        and (
          c.patient_user_id = auth.uid()
          or (
            c.organization_id is not null
            and public.is_provider_org_member(c.organization_id)
          )
          or exists (
            select 1
            from public.message_participants me
            where me.conversation_id = c.id
              and me.party_type = 'user'
              and me.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Participants read messages" on public.message_messages;
create policy "Participants read messages"
  on public.message_messages for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.message_conversations c
      where c.id = conversation_id
        and (
          c.patient_user_id = auth.uid()
          or (
            c.organization_id is not null
            and public.is_provider_org_member(c.organization_id)
          )
          or exists (
            select 1
            from public.message_participants me
            where me.conversation_id = c.id
              and me.party_type = 'user'
              and me.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Patients insert own replies" on public.message_messages;
create policy "Users insert own message replies"
  on public.message_messages for insert to authenticated
  with check (
    sender_party_type = 'user'
    and sender_user_id = auth.uid()
    and (
      exists (
        select 1
        from public.message_conversations c
        where c.id = conversation_id
          and c.kind = 'org_patient'
          and c.patient_user_id = auth.uid()
          and exists (
            select 1
            from public.patient_provider_connections x
            where x.organization_id = c.organization_id
              and x.patient_id = auth.uid()
              and x.status = 'approved'
          )
      )
      or exists (
        select 1
        from public.message_conversations c
        join public.message_participants me
          on me.conversation_id = c.id
         and me.party_type = 'user'
         and me.user_id = auth.uid()
        where c.id = conversation_id
          and c.kind = 'direct'
      )
    )
  );

-- ========== Search peers ==========

create or replace function public.search_messageable_users(
  p_query text,
  p_organization_id uuid default null,
  p_limit int default 20
)
returns table (
  user_id uuid,
  full_name text,
  patient_id text,
  organization_id uuid,
  organization_name text,
  is_practitioner boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := trim(coalesce(p_query, ''));
  v_digits text := regexp_replace(v_q, '\s+', '', 'g');
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_q) < 2 and char_length(v_digits) < 4 then
    return;
  end if;

  return query
  with my_orgs as (
    select o.id, o.name
    from public.provider_organizations o
    where public.is_linked_to_org(o.id, v_uid)
      and (p_organization_id is null or o.id = p_organization_id)
  ),
  candidates as (
    select
      p.user_id,
      p.full_name,
      p.patient_id,
      mo.id as organization_id,
      mo.name as organization_name,
      public.is_org_practitioner(mo.id, p.user_id) as is_practitioner
    from my_orgs mo
    join public.profiles p on true
    where p.user_id <> v_uid
      and public.is_linked_to_org(mo.id, p.user_id)
      and public.can_direct_message(mo.id, v_uid, p.user_id)
      and (
        (char_length(v_q) >= 2 and p.full_name ilike '%' || v_q || '%')
        or (
          char_length(v_digits) >= 4
          and p.patient_id is not null
          and p.patient_id like v_digits || '%'
        )
      )
  ),
  ranked as (
    select distinct on (c.user_id)
      c.user_id,
      c.full_name,
      c.patient_id,
      c.organization_id,
      c.organization_name,
      c.is_practitioner
    from candidates c
    order by
      c.user_id,
      c.is_practitioner desc,
      c.organization_name asc
  )
  select
    r.user_id,
    r.full_name,
    r.patient_id,
    r.organization_id,
    r.organization_name,
    r.is_practitioner
  from ranked r
  order by r.full_name asc nulls last
  limit v_limit;
end;
$$;

revoke all on function public.search_messageable_users(text, uuid, int) from public;
grant execute on function public.search_messageable_users(text, uuid, int) to authenticated;

-- ========== Start / continue direct thread ==========

create or replace function public.start_direct_conversation(
  p_other_user_id uuid,
  p_organization_id uuid,
  p_body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_low uuid;
  v_high uuid;
  v_conv_id uuid;
  v_now timestamptz := now();
  v_message public.message_messages;
  v_created boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_other_user_id is null or p_organization_id is null then
    raise exception 'Recipient and organization are required';
  end if;

  if not public.can_direct_message(p_organization_id, v_uid, p_other_user_id) then
    raise exception 'You cannot message this person';
  end if;

  if p_other_user_id < v_uid then
    v_low := p_other_user_id;
    v_high := v_uid;
  else
    v_low := v_uid;
    v_high := p_other_user_id;
  end if;

  select conversation_id into v_conv_id
  from public.message_direct_pairs
  where organization_id = p_organization_id
    and user_low = v_low
    and user_high = v_high;

  if v_conv_id is null then
    begin
      insert into public.message_conversations (
        kind,
        organization_id,
        patient_user_id,
        last_message_at,
        last_message_preview,
        created_at,
        updated_at
      )
      values (
        'direct',
        p_organization_id,
        null,
        case when v_body is not null then v_now else null end,
        case when v_body is not null then left(v_body, 160) else null end,
        v_now,
        v_now
      )
      returning id into v_conv_id;

      insert into public.message_direct_pairs (
        conversation_id,
        organization_id,
        user_low,
        user_high
      )
      values (v_conv_id, p_organization_id, v_low, v_high);

      insert into public.message_participants (conversation_id, party_type, user_id)
      values
        (v_conv_id, 'user', v_uid),
        (v_conv_id, 'user', p_other_user_id);

      v_created := true;
    exception
      when unique_violation then
        delete from public.message_conversations where id = v_conv_id;
        select conversation_id into v_conv_id
        from public.message_direct_pairs
        where organization_id = p_organization_id
          and user_low = v_low
          and user_high = v_high;
        v_created := false;
    end;
  end if;

  if v_conv_id is null then
    raise exception 'Could not open conversation';
  end if;

  -- Ensure both participants exist (idempotent for raced creates).
  insert into public.message_participants (conversation_id, party_type, user_id)
  select v_conv_id, 'user', v_uid
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = v_conv_id and p.party_type = 'user' and p.user_id = v_uid
  );

  insert into public.message_participants (conversation_id, party_type, user_id)
  select v_conv_id, 'user', p_other_user_id
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = v_conv_id
      and p.party_type = 'user'
      and p.user_id = p_other_user_id
  );

  if v_body is not null then
    insert into public.message_messages (
      conversation_id,
      sender_party_type,
      sender_user_id,
      body,
      created_at
    )
    values (
      v_conv_id,
      'user',
      v_uid,
      v_body,
      v_now
    )
    returning * into v_message;

    update public.message_conversations
    set
      last_message_at = v_now,
      last_message_preview = left(v_body, 160),
      updated_at = v_now
    where id = v_conv_id;

    update public.message_participants
    set last_read_at = v_now
    where conversation_id = v_conv_id
      and party_type = 'user'
      and user_id = v_uid;
  end if;

  return jsonb_build_object(
    'conversation_id', v_conv_id,
    'created', v_created,
    'message', case when v_message.id is null then null else to_jsonb(v_message) end
  );
end;
$$;

revoke all on function public.start_direct_conversation(uuid, uuid, text) from public;
grant execute on function public.start_direct_conversation(uuid, uuid, text) to authenticated;

-- ========== Extend patient reply RPC to also post in direct threads ==========

create or replace function public.post_patient_message(
  p_conversation_id uuid,
  p_body text
)
returns public.message_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_row public.message_messages;
  v_conv public.message_conversations;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if v_body = '' then
    raise exception 'Message body is required';
  end if;

  select * into v_conv
  from public.message_conversations c
  where c.id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.kind = 'org_patient' then
    if v_conv.patient_user_id is distinct from auth.uid() then
      raise exception 'Conversation not found';
    end if;
    if not exists (
      select 1
      from public.patient_provider_connections x
      where x.organization_id = v_conv.organization_id
        and x.patient_id = auth.uid()
        and x.status = 'approved'
    ) then
      raise exception 'Not connected';
    end if;
  elsif v_conv.kind = 'direct' then
    if not exists (
      select 1
      from public.message_participants p
      where p.conversation_id = p_conversation_id
        and p.party_type = 'user'
        and p.user_id = auth.uid()
    ) then
      raise exception 'Conversation not found';
    end if;
  else
    raise exception 'Unsupported conversation';
  end if;

  insert into public.message_messages (
    conversation_id,
    sender_party_type,
    sender_user_id,
    body,
    created_at
  )
  values (
    p_conversation_id,
    'user',
    auth.uid(),
    v_body,
    v_now
  )
  returning * into v_row;

  update public.message_conversations
  set
    last_message_at = v_now,
    last_message_preview = left(v_body, 160),
    updated_at = v_now
  where id = p_conversation_id;

  update public.message_participants
  set last_read_at = v_now
  where conversation_id = p_conversation_id
    and party_type = 'user'
    and user_id = auth.uid();

  return v_row;
end;
$$;
