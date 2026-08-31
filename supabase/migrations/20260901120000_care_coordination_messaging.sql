-- Patient-initiated care coordination threads: patient + provider org + payer org.
-- Optional staff users may be added by each org. Existing org_patient 1:1 threads are unchanged.

-- ========== Conversation shape ==========

alter table public.message_conversations
  drop constraint if exists message_conversations_kind_shape;

alter table public.message_conversations
  add constraint message_conversations_kind_shape check (
    (
      kind = 'org_patient'
      and patient_user_id is not null
      and (
        (organization_id is not null and payer_organization_id is null)
        or (payer_organization_id is not null and organization_id is null)
      )
    )
    or (
      kind = 'direct'
      and organization_id is not null
      and patient_user_id is null
    )
    or (
      kind = 'care_coordination'
      and patient_user_id is not null
      and organization_id is not null
      and payer_organization_id is not null
    )
  );

create unique index if not exists message_conversations_care_coordination_uidx
  on public.message_conversations (patient_user_id, organization_id, payer_organization_id)
  where kind = 'care_coordination';

create index if not exists message_conversations_care_coord_provider_idx
  on public.message_conversations (organization_id, last_message_at desc nulls last)
  where kind = 'care_coordination';

create index if not exists message_conversations_care_coord_payer_idx
  on public.message_conversations (payer_organization_id, last_message_at desc nulls last)
  where kind = 'care_coordination';

comment on column public.message_conversations.kind is
  'org_patient (1:1 org↔patient), direct (user↔user), care_coordination (patient+provider+payer).';

-- ========== Helpers ==========

create or replace function public.is_care_coordination_staff(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_conversations c
    join public.message_participants p
      on p.conversation_id = c.id
     and p.party_type = 'user'
     and p.user_id = p_user_id
    where c.id = p_conversation_id
      and c.kind = 'care_coordination'
      and c.patient_user_id is distinct from p_user_id
      and (
        exists (
          select 1
          from public.provider_org_members m
          where m.organization_id = c.organization_id
            and m.user_id = p_user_id
            and m.deleted_at is null
        )
        or exists (
          select 1
          from public.payer_org_members m
          where m.organization_id = c.payer_organization_id
            and m.user_id = p_user_id
            and m.deleted_at is null
        )
      )
  );
$$;

create or replace function public.can_read_message_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_conversations c
    where c.id = p_conversation_id
      and (
        public.is_staff()
        or c.patient_user_id = auth.uid()
        or (
          c.organization_id is not null
          and public.is_provider_org_member(c.organization_id)
        )
        or (
          c.payer_organization_id is not null
          and public.is_payer_org_member(c.payer_organization_id)
        )
        or public.is_message_conversation_participant(c.id, auth.uid())
      )
  );
$$;

grant execute on function public.is_care_coordination_staff(uuid, uuid) to authenticated;

-- ========== List orgs a patient may add to start coordination ==========

create or replace function public.list_care_coordination_candidates(p_source_conversation_id uuid)
returns table (
  organization_id uuid,
  org_kind text,
  organization_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.message_conversations;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conv
  from public.message_conversations c
  where c.id = p_source_conversation_id
    and c.kind = 'org_patient'
    and c.patient_user_id = v_uid;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.organization_id is not null and v_conv.payer_organization_id is null then
    return query
    select
      po.id as organization_id,
      'payer'::text as org_kind,
      porg.name as organization_name
    from public.provider_payer_connections l
    join public.payer_organizations po on po.id = l.payer_organization_id
    join public.payer_organizations porg on porg.id = po.id
    where l.provider_organization_id = v_conv.organization_id
      and l.status = 'approved'
      and exists (
        select 1
        from public.patient_payer_connections ppc
        where ppc.payer_organization_id = l.payer_organization_id
          and ppc.patient_id = v_uid
          and ppc.status = 'approved'
      )
      and exists (
        select 1
        from public.patient_provider_connections ppc
        where ppc.organization_id = v_conv.organization_id
          and ppc.patient_id = v_uid
          and ppc.status = 'approved'
      )
    order by porg.name;
    return;
  end if;

  if v_conv.payer_organization_id is not null and v_conv.organization_id is null then
    return query
    select
      prov.id as organization_id,
      'provider'::text as org_kind,
      porg.name as organization_name
    from public.provider_payer_connections l
    join public.provider_organizations prov on prov.id = l.provider_organization_id
    join public.provider_organizations porg on porg.id = prov.id
    where l.payer_organization_id = v_conv.payer_organization_id
      and l.status = 'approved'
      and exists (
        select 1
        from public.patient_payer_connections ppc
        where ppc.payer_organization_id = v_conv.payer_organization_id
          and ppc.patient_id = v_uid
          and ppc.status = 'approved'
      )
      and exists (
        select 1
        from public.patient_provider_connections ppc
        where ppc.organization_id = l.provider_organization_id
          and ppc.patient_id = v_uid
          and ppc.status = 'approved'
      )
    order by porg.name;
    return;
  end if;

  raise exception 'Invalid source conversation';
end;
$$;

-- ========== Find or create coordination thread ==========

create or replace function public.start_care_coordination_conversation(
  p_provider_organization_id uuid,
  p_payer_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv_id uuid;
  v_now timestamptz := now();
  v_created boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_provider_organization_id is null or p_payer_organization_id is null then
    raise exception 'Provider and payer organizations are required';
  end if;

  if not exists (
    select 1
    from public.patient_provider_connections c
    where c.organization_id = p_provider_organization_id
      and c.patient_id = v_uid
      and c.status = 'approved'
  ) then
    raise exception 'Not connected to this provider';
  end if;

  if not exists (
    select 1
    from public.patient_payer_connections c
    where c.payer_organization_id = p_payer_organization_id
      and c.patient_id = v_uid
      and c.status = 'approved'
  ) then
    raise exception 'Not connected to this payer';
  end if;

  if not exists (
    select 1
    from public.provider_payer_connections l
    where l.provider_organization_id = p_provider_organization_id
      and l.payer_organization_id = p_payer_organization_id
      and l.status = 'approved'
  ) then
    raise exception 'Provider and payer organizations are not linked';
  end if;

  if not public.has_org_messaging_consent(p_provider_organization_id, v_uid) then
    raise exception 'Messaging consent required';
  end if;

  select c.id into v_conv_id
  from public.message_conversations c
  where c.kind = 'care_coordination'
    and c.patient_user_id = v_uid
    and c.organization_id = p_provider_organization_id
    and c.payer_organization_id = p_payer_organization_id;

  if v_conv_id is null then
    insert into public.message_conversations (
      kind,
      patient_user_id,
      organization_id,
      payer_organization_id,
      created_at,
      updated_at
    )
    values (
      'care_coordination',
      v_uid,
      p_provider_organization_id,
      p_payer_organization_id,
      v_now,
      v_now
    )
    returning id into v_conv_id;

    v_created := true;

    insert into public.message_participants (conversation_id, party_type, user_id)
    values (v_conv_id, 'user', v_uid);

    insert into public.message_participants (conversation_id, party_type, organization_id)
    values (v_conv_id, 'organization', p_provider_organization_id);

    insert into public.message_participants (conversation_id, party_type, payer_organization_id)
    values (v_conv_id, 'organization', p_payer_organization_id);
  end if;

  return jsonb_build_object(
    'conversation_id', v_conv_id,
    'created', v_created
  );
end;
$$;

-- ========== Org adds staff to coordination thread ==========

create or replace function public.list_care_coordination_staff_candidates(p_conversation_id uuid)
returns table (
  user_id uuid,
  full_name text,
  already_added boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conv public.message_conversations;
  v_provider_org uuid;
  v_payer_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conv
  from public.message_conversations c
  where c.id = p_conversation_id
    and c.kind = 'care_coordination';

  if not found then
    raise exception 'Conversation not found';
  end if;

  v_provider_org := v_conv.organization_id;
  v_payer_org := v_conv.payer_organization_id;

  if public.can_write_provider_org(v_provider_org) or public.is_admin() then
    return query
    select
      m.user_id,
      coalesce(p.full_name, 'Staff') as full_name,
      exists (
        select 1
        from public.message_participants mp
        where mp.conversation_id = p_conversation_id
          and mp.party_type = 'user'
          and mp.user_id = m.user_id
      ) as already_added
    from public.provider_org_members m
    join public.profiles p on p.user_id = m.user_id
    where m.organization_id = v_provider_org
      and m.deleted_at is null
    order by p.full_name;
    return;
  end if;

  if public.can_write_payer_org(v_payer_org) or public.is_admin() then
    return query
    select
      m.user_id,
      coalesce(p.full_name, 'Staff') as full_name,
      exists (
        select 1
        from public.message_participants mp
        where mp.conversation_id = p_conversation_id
          and mp.party_type = 'user'
          and mp.user_id = m.user_id
      ) as already_added
    from public.payer_org_members m
    join public.profiles p on p.user_id = m.user_id
    where m.organization_id = v_payer_org
      and m.deleted_at is null
    order by p.full_name;
    return;
  end if;

  raise exception 'Forbidden';
end;
$$;

create or replace function public.add_care_coordination_staff(
  p_conversation_id uuid,
  p_user_id uuid
)
returns public.message_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.message_conversations;
  v_row public.message_participants;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null then
    raise exception 'Staff user is required';
  end if;

  select * into v_conv
  from public.message_conversations c
  where c.id = p_conversation_id
    and c.kind = 'care_coordination';

  if not found then
    raise exception 'Conversation not found';
  end if;

  if public.can_write_provider_org(v_conv.organization_id) or public.is_admin() then
    if not exists (
      select 1
      from public.provider_org_members m
      where m.organization_id = v_conv.organization_id
        and m.user_id = p_user_id
        and m.deleted_at is null
    ) then
      raise exception 'User is not a member of this provider organization';
    end if;
  elsif public.can_write_payer_org(v_conv.payer_organization_id) or public.is_admin() then
    if not exists (
      select 1
      from public.payer_org_members m
      where m.organization_id = v_conv.payer_organization_id
        and m.user_id = p_user_id
        and m.deleted_at is null
    ) then
      raise exception 'User is not a member of this payer organization';
    end if;
  else
    raise exception 'Forbidden';
  end if;

  insert into public.message_participants (conversation_id, party_type, user_id)
  select p_conversation_id, 'user', p_user_id
  where not exists (
    select 1
    from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'user'
      and p.user_id = p_user_id
  )
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
    from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'user'
      and p.user_id = p_user_id;
  end if;

  return v_row;
end;
$$;

-- ========== Messaging: patient + staff replies in coordination threads ==========

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
    if v_conv.organization_id is not null then
      if not public.has_org_messaging_consent(v_conv.organization_id, auth.uid()) then
        raise exception 'Messaging consent required';
      end if;
    elsif v_conv.payer_organization_id is not null then
      if not exists (
        select 1
        from public.patient_payer_connections c
        where c.payer_organization_id = v_conv.payer_organization_id
          and c.patient_id = auth.uid()
          and c.status = 'approved'
      ) then
        raise exception 'Not connected to this payer';
      end if;
    else
      raise exception 'Invalid conversation';
    end if;
  elsif v_conv.kind = 'direct' then
    if not public.is_message_conversation_participant(p_conversation_id, auth.uid()) then
      raise exception 'Conversation not found';
    end if;
  elsif v_conv.kind = 'care_coordination' then
    if v_conv.patient_user_id = auth.uid() then
      if not public.has_org_messaging_consent(v_conv.organization_id, auth.uid()) then
        raise exception 'Messaging consent required';
      end if;
    elsif not public.is_care_coordination_staff(p_conversation_id, auth.uid()) then
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

-- ========== Provider org reply (org_patient + care_coordination) ==========

create or replace function public.post_org_message(
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
    and c.kind in ('org_patient', 'care_coordination');

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.organization_id is null or v_conv.patient_user_id is null then
    raise exception 'Invalid conversation';
  end if;

  if not public.can_write_provider_org(v_conv.organization_id) and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if not exists (
    select 1
    from public.patient_provider_connections x
    where x.organization_id = v_conv.organization_id
      and x.patient_id = v_conv.patient_user_id
      and x.status = 'approved'
  ) then
    raise exception 'Patient is not connected';
  end if;

  insert into public.message_participants (conversation_id, party_type, user_id)
  select p_conversation_id, 'user', v_conv.patient_user_id
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'user' and p.user_id = v_conv.patient_user_id
  );

  insert into public.message_participants (conversation_id, party_type, organization_id)
  select p_conversation_id, 'organization', v_conv.organization_id
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'organization' and p.organization_id = v_conv.organization_id
  );

  insert into public.message_messages (
    conversation_id,
    sender_party_type,
    sender_user_id,
    sender_organization_id,
    body,
    metadata,
    created_at
  )
  values (
    p_conversation_id,
    'organization',
    auth.uid(),
    v_conv.organization_id,
    v_body,
    jsonb_build_object('reply', true),
    v_now
  )
  returning * into v_row;

  update public.message_conversations
  set last_message_at = v_now, last_message_preview = left(v_body, 160), updated_at = v_now
  where id = p_conversation_id;

  update public.message_participants
  set last_read_at = v_now
  where conversation_id = p_conversation_id
    and party_type = 'organization'
    and organization_id = v_conv.organization_id;

  if v_conv.kind = 'org_patient' then
    insert into public.patient_provider_activities (
      organization_id, patient_id, event_type, summary, metadata
    )
    values (
      v_conv.organization_id,
      v_conv.patient_user_id,
      'message_sent',
      left(format('Message: %s', left(v_body, 120)), 200),
      jsonb_build_object('message_id', v_row.id, 'conversation_id', p_conversation_id, 'reply', true)
    );
  end if;

  return v_row;
end;
$$;

-- ========== Payer org reply (org_patient + care_coordination) ==========

create or replace function public.post_payer_org_message(
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
    and c.kind in ('org_patient', 'care_coordination');

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.payer_organization_id is null or v_conv.patient_user_id is null then
    raise exception 'Invalid conversation';
  end if;

  if not public.can_write_payer_org(v_conv.payer_organization_id) and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if not exists (
    select 1
    from public.patient_payer_connections x
    where x.payer_organization_id = v_conv.payer_organization_id
      and x.patient_id = v_conv.patient_user_id
      and x.status = 'approved'
  ) then
    raise exception 'Patient is not connected';
  end if;

  insert into public.message_participants (conversation_id, party_type, user_id)
  select p_conversation_id, 'user', v_conv.patient_user_id
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'user' and p.user_id = v_conv.patient_user_id
  );

  insert into public.message_participants (conversation_id, party_type, payer_organization_id)
  select p_conversation_id, 'organization', v_conv.payer_organization_id
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'organization' and p.payer_organization_id = v_conv.payer_organization_id
  );

  insert into public.message_messages (
    conversation_id,
    sender_party_type,
    sender_user_id,
    sender_payer_organization_id,
    body,
    metadata,
    created_at
  )
  values (
    p_conversation_id,
    'organization',
    auth.uid(),
    v_conv.payer_organization_id,
    v_body,
    jsonb_build_object('reply', true),
    v_now
  )
  returning * into v_row;

  update public.message_conversations
  set last_message_at = v_now, last_message_preview = left(v_body, 160), updated_at = v_now
  where id = p_conversation_id;

  update public.message_participants
  set last_read_at = v_now
  where conversation_id = p_conversation_id
    and party_type = 'organization'
    and payer_organization_id = v_conv.payer_organization_id;

  return v_row;
end;
$$;

-- Allow user sends in care_coordination via RLS (patient + added staff)
drop policy if exists "Users insert own message replies" on public.message_messages;
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
      or (
        exists (
          select 1
          from public.message_conversations c
          where c.id = conversation_id and c.kind = 'direct'
        )
        and public.is_message_conversation_participant(conversation_id, auth.uid())
      )
      or public.is_care_coordination_staff(conversation_id, auth.uid())
      or exists (
        select 1
        from public.message_conversations c
        where c.id = conversation_id
          and c.kind = 'care_coordination'
          and c.patient_user_id = auth.uid()
      )
    )
  );

revoke all on function public.list_care_coordination_candidates(uuid) from public;
grant execute on function public.list_care_coordination_candidates(uuid) to authenticated;

revoke all on function public.start_care_coordination_conversation(uuid, uuid) from public;
grant execute on function public.start_care_coordination_conversation(uuid, uuid) to authenticated;

revoke all on function public.list_care_coordination_staff_candidates(uuid) from public;
grant execute on function public.list_care_coordination_staff_candidates(uuid) to authenticated;

revoke all on function public.add_care_coordination_staff(uuid, uuid) from public;
grant execute on function public.add_care_coordination_staff(uuid, uuid) to authenticated;

comment on function public.list_care_coordination_candidates is
  'From a patient org_patient thread, list linked orgs eligible for a care coordination room.';

comment on function public.start_care_coordination_conversation is
  'Patient find-or-create care coordination thread for provider+payer org pair.';

comment on function public.add_care_coordination_staff is
  'Provider or payer org staff adds an org member to a care coordination thread.';
