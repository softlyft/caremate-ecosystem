-- CareMate messaging: org↔patient threads (broadcast fan-out) + room for direct later.
-- Broadcasts become "send message to many conversations"; push via Edge Function notify-message.

-- ========== Tables ==========

create table if not exists public.message_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('org_patient', 'direct')),
  organization_id uuid
    references public.provider_organizations (id) on delete cascade,
  patient_user_id uuid
    references auth.users (id) on delete cascade,
  subject text,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_conversations_org_patient_shape check (
    (kind = 'org_patient' and organization_id is not null and patient_user_id is not null)
    or (kind = 'direct' and organization_id is null)
  )
);

create unique index if not exists message_conversations_org_patient_uidx
  on public.message_conversations (organization_id, patient_user_id)
  where kind = 'org_patient';

create index if not exists message_conversations_patient_last_idx
  on public.message_conversations (patient_user_id, last_message_at desc nulls last);

create index if not exists message_conversations_org_last_idx
  on public.message_conversations (organization_id, last_message_at desc nulls last);

create table if not exists public.message_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.message_conversations (id) on delete cascade,
  party_type text not null
    check (party_type in ('user', 'organization')),
  user_id uuid references auth.users (id) on delete cascade,
  organization_id uuid references public.provider_organizations (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint message_participants_party_shape check (
    (party_type = 'user' and user_id is not null and organization_id is null)
    or (party_type = 'organization' and organization_id is not null and user_id is null)
  )
);

create unique index if not exists message_participants_user_uidx
  on public.message_participants (conversation_id, user_id)
  where party_type = 'user';

create unique index if not exists message_participants_org_uidx
  on public.message_participants (conversation_id, organization_id)
  where party_type = 'organization';

create table if not exists public.message_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.message_conversations (id) on delete cascade,
  sender_party_type text not null
    check (sender_party_type in ('user', 'organization')),
  sender_user_id uuid references auth.users (id) on delete set null,
  sender_organization_id uuid references public.provider_organizations (id) on delete set null,
  body text not null,
  subject text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint message_messages_sender_shape check (
    (sender_party_type = 'user' and sender_user_id is not null)
    or (sender_party_type = 'organization' and sender_organization_id is not null)
  )
);

create index if not exists message_messages_conversation_created_idx
  on public.message_messages (conversation_id, created_at asc);

drop trigger if exists message_conversations_set_updated_at on public.message_conversations;
create trigger message_conversations_set_updated_at
  before update on public.message_conversations
  for each row execute function public.set_updated_at();

-- ========== RLS ==========

alter table public.message_conversations enable row level security;
alter table public.message_participants enable row level security;
alter table public.message_messages enable row level security;

create policy "Patients read own message conversations"
  on public.message_conversations for select to authenticated
  using (
    patient_user_id = auth.uid()
    or public.is_staff()
    or (
      organization_id is not null
      and public.is_provider_org_member(organization_id)
    )
  );

create policy "Patients read own message participants"
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
        )
    )
  );

create policy "Patients update own read cursor"
  on public.message_participants for update to authenticated
  using (party_type = 'user' and user_id = auth.uid())
  with check (party_type = 'user' and user_id = auth.uid());

create policy "Org members update org read cursor"
  on public.message_participants for update to authenticated
  using (
    party_type = 'organization'
    and organization_id is not null
    and public.is_provider_org_member(organization_id)
  )
  with check (
    party_type = 'organization'
    and organization_id is not null
    and public.is_provider_org_member(organization_id)
  );

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
        )
    )
  );

create policy "Patients insert own replies"
  on public.message_messages for insert to authenticated
  with check (
    sender_party_type = 'user'
    and sender_user_id = auth.uid()
    and exists (
      select 1
      from public.message_conversations c
      where c.id = conversation_id
        and c.patient_user_id = auth.uid()
        and (
          c.kind <> 'org_patient'
          or exists (
            select 1
            from public.patient_provider_connections x
            where x.organization_id = c.organization_id
              and x.patient_id = auth.uid()
              and x.status = 'approved'
          )
        )
    )
  );

-- Inserts for org sends go through security-definer RPC (below).

-- ========== Send RPC (org → patients) ==========

create or replace function public.send_provider_org_message(
  p_organization_id uuid,
  p_body text,
  p_subject text default null,
  p_audience text default 'all',
  p_patient_ids uuid[] default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_subject text := nullif(trim(coalesce(p_subject, '')), '');
  v_preview text;
  v_recipients uuid[];
  v_patient uuid;
  v_conversation_id uuid;
  v_message_id uuid;
  v_now timestamptz := now();
  v_message_ids uuid[] := '{}';
  v_conversation_ids uuid[] := '{}';
  v_patient_ids uuid[] := '{}';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_write_provider_org(p_organization_id) and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if v_body = '' then
    raise exception 'Message body is required';
  end if;

  if p_audience not in ('all', 'selected') then
    raise exception 'Invalid audience';
  end if;

  if p_audience = 'all' then
    select coalesce(array_agg(c.patient_id), '{}')
      into v_recipients
    from public.patient_provider_connections c
    where c.organization_id = p_organization_id
      and c.status = 'approved';
  else
    if p_patient_ids is null or cardinality(p_patient_ids) = 0 then
      raise exception 'Select at least one patient';
    end if;
    select coalesce(array_agg(c.patient_id), '{}')
      into v_recipients
    from public.patient_provider_connections c
    where c.organization_id = p_organization_id
      and c.status = 'approved'
      and c.patient_id = any (p_patient_ids);
  end if;

  if cardinality(v_recipients) = 0 then
    raise exception 'No approved recipients';
  end if;

  v_preview := left(v_body, 160);

  foreach v_patient in array v_recipients
  loop
    insert into public.message_conversations as mc (
      kind,
      organization_id,
      patient_user_id,
      subject,
      last_message_at,
      last_message_preview,
      created_at,
      updated_at
    )
    values (
      'org_patient',
      p_organization_id,
      v_patient,
      v_subject,
      v_now,
      v_preview,
      v_now,
      v_now
    )
    on conflict (organization_id, patient_user_id)
      where kind = 'org_patient'
    do update set
      last_message_at = excluded.last_message_at,
      last_message_preview = excluded.last_message_preview,
      subject = coalesce(mc.subject, excluded.subject),
      updated_at = excluded.updated_at
    returning id into v_conversation_id;

    insert into public.message_participants (conversation_id, party_type, user_id)
    select v_conversation_id, 'user', v_patient
    where not exists (
      select 1
      from public.message_participants p
      where p.conversation_id = v_conversation_id
        and p.party_type = 'user'
        and p.user_id = v_patient
    );

    insert into public.message_participants (conversation_id, party_type, organization_id)
    select v_conversation_id, 'organization', p_organization_id
    where not exists (
      select 1
      from public.message_participants p
      where p.conversation_id = v_conversation_id
        and p.party_type = 'organization'
        and p.organization_id = p_organization_id
    );

    -- Org read cursor advances on send so staff don't see their own outbound as unread.
    update public.message_participants
    set last_read_at = v_now
    where conversation_id = v_conversation_id
      and party_type = 'organization'
      and organization_id = p_organization_id;

    insert into public.message_messages (
      conversation_id,
      sender_party_type,
      sender_user_id,
      sender_organization_id,
      body,
      subject,
      metadata,
      created_at
    )
    values (
      v_conversation_id,
      'organization',
      auth.uid(),
      p_organization_id,
      v_body,
      v_subject,
      jsonb_build_object(
        'audience', p_audience,
        'expires_at', p_expires_at,
        'broadcast', true
      ),
      v_now
    )
    returning id into v_message_id;

    v_message_ids := array_append(v_message_ids, v_message_id);
    v_conversation_ids := array_append(v_conversation_ids, v_conversation_id);
    v_patient_ids := array_append(v_patient_ids, v_patient);

    insert into public.patient_provider_activities (
      organization_id,
      patient_id,
      event_type,
      summary,
      metadata
    )
    values (
      p_organization_id,
      v_patient,
      'message_sent',
      left(format('Message: %s', coalesce(v_subject, v_preview)), 200),
      jsonb_build_object(
        'message_id', v_message_id,
        'conversation_id', v_conversation_id
      )
    );
  end loop;

  -- Keep legacy broadcast row as send audit (optional history in old UI).
  insert into public.provider_broadcasts (
    organization_id,
    title,
    message,
    audience,
    status,
    expires_at,
    created_by,
    sent_at
  )
  values (
    p_organization_id,
    coalesce(v_subject, left(v_body, 80)),
    v_body,
    p_audience,
    'sent',
    p_expires_at,
    auth.uid(),
    v_now
  );

  return jsonb_build_object(
    'message_ids', to_jsonb(v_message_ids),
    'conversation_ids', to_jsonb(v_conversation_ids),
    'patient_ids', to_jsonb(v_patient_ids),
    'recipient_count', cardinality(v_recipients)
  );
end;
$$;

revoke all on function public.send_provider_org_message(uuid, text, text, text, uuid[], timestamptz) from public;
grant execute on function public.send_provider_org_message(uuid, text, text, text, uuid[], timestamptz) to authenticated;

-- Patient reply helper: bump conversation preview + notify path expects a message row.
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
  where c.id = p_conversation_id
    and c.patient_user_id = auth.uid();

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.kind = 'org_patient' then
    if not exists (
      select 1
      from public.patient_provider_connections x
      where x.organization_id = v_conv.organization_id
        and x.patient_id = auth.uid()
        and x.status = 'approved'
    ) then
      raise exception 'Not connected';
    end if;
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

revoke all on function public.post_patient_message(uuid, text) from public;
grant execute on function public.post_patient_message(uuid, text) to authenticated;

comment on table public.message_conversations is
  'Chat threads: org_patient today; direct reserved for patient↔practitioner.';
comment on function public.send_provider_org_message is
  'Provider staff fan-out a message to approved connected patients (inbox + legacy broadcast audit).';
