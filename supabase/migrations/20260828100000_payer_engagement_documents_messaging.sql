-- Payer portal engagement: documents + org↔patient messaging (mirrors provider patterns).

-- ========== Documents ==========

create table if not exists public.payer_documents (
  id uuid primary key default gen_random_uuid(),
  payer_organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null
    check (document_type in (
      'prescription',
      'lab_result',
      'imaging_report',
      'referral_letter',
      'discharge_summary',
      'invoice'
    )),
  title text not null,
  file_url text not null,
  file_name text,
  mime_type text,
  uploaded_by uuid references auth.users (id) on delete set null,
  source text not null default 'payer'
    check (source in ('payer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payer_documents_org_patient_idx
  on public.payer_documents (payer_organization_id, patient_id, created_at desc);

create index if not exists payer_documents_patient_idx
  on public.payer_documents (patient_id, created_at desc);

drop trigger if exists payer_documents_set_updated_at on public.payer_documents;
create trigger payer_documents_set_updated_at
  before update on public.payer_documents
  for each row execute function public.set_updated_at();

alter table public.payer_documents enable row level security;

create policy "Patients read own payer documents"
  on public.payer_documents for select to authenticated
  using (patient_id = auth.uid());

create policy "Payer members read org documents"
  on public.payer_documents for select to authenticated
  using (
    public.is_payer_org_member(payer_organization_id)
    or public.is_staff()
  );

create policy "Payer staff write documents"
  on public.payer_documents for all to authenticated
  using (public.can_write_payer_org(payer_organization_id) or public.is_staff())
  with check (public.can_write_payer_org(payer_organization_id) or public.is_staff());

comment on table public.payer_documents is
  'Documents shared by payer org staff with connected patients (provider-documents bucket).';

-- Storage: same bucket, path {payer_organization_id}/{patient_id}/{document_id}/{filename}
create policy "Payer staff upload documents storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'provider-documents'
    and (
      public.can_write_payer_org(public.provider_document_path_org_id(name))
      or public.is_admin()
    )
  );

create policy "Payer staff read documents storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'provider-documents'
    and (
      public.is_payer_org_member(public.provider_document_path_org_id(name))
      or public.is_staff()
      or split_part(name, '/', 2) = auth.uid()::text
    )
  );

create policy "Payer staff update documents storage"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'provider-documents'
    and (public.can_write_payer_org(public.provider_document_path_org_id(name)) or public.is_admin())
  );

create policy "Payer staff delete documents storage"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'provider-documents'
    and (public.can_write_payer_org(public.provider_document_path_org_id(name)) or public.is_admin())
  );

-- ========== Messaging: payer org threads ==========

alter table public.message_conversations
  add column if not exists payer_organization_id uuid
    references public.payer_organizations (id) on delete cascade;

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
    or (kind = 'direct' and organization_id is not null and patient_user_id is null)
  );

drop index if exists message_conversations_org_patient_uidx;

create unique index if not exists message_conversations_provider_org_patient_uidx
  on public.message_conversations (organization_id, patient_user_id)
  where kind = 'org_patient' and organization_id is not null;

create unique index if not exists message_conversations_payer_org_patient_uidx
  on public.message_conversations (payer_organization_id, patient_user_id)
  where kind = 'org_patient' and payer_organization_id is not null;

create index if not exists message_conversations_payer_last_idx
  on public.message_conversations (payer_organization_id, last_message_at desc nulls last);

alter table public.message_participants
  add column if not exists payer_organization_id uuid
    references public.payer_organizations (id) on delete cascade;

alter table public.message_participants
  drop constraint if exists message_participants_party_shape;

alter table public.message_participants
  add constraint message_participants_party_shape check (
    (
      party_type = 'user'
      and user_id is not null
      and organization_id is null
      and payer_organization_id is null
    )
    or (
      party_type = 'organization'
      and user_id is null
      and (
        (organization_id is not null and payer_organization_id is null)
        or (payer_organization_id is not null and organization_id is null)
      )
    )
  );

drop index if exists message_participants_org_uidx;

create unique index if not exists message_participants_provider_org_uidx
  on public.message_participants (conversation_id, organization_id)
  where party_type = 'organization' and organization_id is not null;

create unique index if not exists message_participants_payer_org_uidx
  on public.message_participants (conversation_id, payer_organization_id)
  where party_type = 'organization' and payer_organization_id is not null;

alter table public.message_messages
  add column if not exists sender_payer_organization_id uuid
    references public.payer_organizations (id) on delete set null;

alter table public.message_messages
  drop constraint if exists message_messages_sender_shape;

alter table public.message_messages
  add constraint message_messages_sender_shape check (
    (sender_party_type = 'user' and sender_user_id is not null)
    or (
      sender_party_type = 'organization'
      and (
        sender_organization_id is not null
        or sender_payer_organization_id is not null
      )
    )
  );

-- RLS helpers: payer org members can read payer org threads
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

drop policy if exists "Participants read message conversations" on public.message_conversations;
create policy "Participants read message conversations"
  on public.message_conversations for select to authenticated
  using (
    public.is_staff()
    or patient_user_id = auth.uid()
    or (
      organization_id is not null
      and public.is_provider_org_member(organization_id)
    )
    or (
      payer_organization_id is not null
      and public.is_payer_org_member(payer_organization_id)
    )
    or public.is_message_conversation_participant(id, auth.uid())
  );

-- ========== RPC: payer org fan-out ==========

create or replace function public.send_payer_org_message(
  p_payer_organization_id uuid,
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_write_payer_org(p_payer_organization_id) and not public.is_admin() then
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
    from public.patient_payer_connections c
    where c.payer_organization_id = p_payer_organization_id
      and c.status = 'approved';
  else
    if p_patient_ids is null or cardinality(p_patient_ids) = 0 then
      raise exception 'Select at least one patient';
    end if;
    select coalesce(array_agg(c.patient_id), '{}')
      into v_recipients
    from public.patient_payer_connections c
    where c.payer_organization_id = p_payer_organization_id
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
      payer_organization_id,
      patient_user_id,
      subject,
      last_message_at,
      last_message_preview,
      created_at,
      updated_at
    )
    values (
      'org_patient',
      p_payer_organization_id,
      v_patient,
      v_subject,
      v_now,
      v_preview,
      v_now,
      v_now
    )
    on conflict (payer_organization_id, patient_user_id)
      where kind = 'org_patient' and payer_organization_id is not null
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

    insert into public.message_participants (conversation_id, party_type, payer_organization_id)
    select v_conversation_id, 'organization', p_payer_organization_id
    where not exists (
      select 1
      from public.message_participants p
      where p.conversation_id = v_conversation_id
        and p.party_type = 'organization'
        and p.payer_organization_id = p_payer_organization_id
    );

    insert into public.message_messages (
      conversation_id,
      sender_party_type,
      sender_user_id,
      sender_payer_organization_id,
      body,
      subject,
      metadata,
      created_at
    )
    values (
      v_conversation_id,
      'organization',
      auth.uid(),
      p_payer_organization_id,
      v_body,
      v_subject,
      jsonb_build_object(
        'audience', p_audience,
        'expires_at', p_expires_at
      ),
      v_now
    )
    returning id into v_message_id;

    v_message_ids := array_append(v_message_ids, v_message_id);
  end loop;

  return jsonb_build_object(
    'message_ids', v_message_ids,
    'recipient_count', cardinality(v_recipients)
  );
end;
$$;

revoke all on function public.send_payer_org_message(uuid, text, text, text, uuid[], timestamptz) from public;
grant execute on function public.send_payer_org_message(uuid, text, text, text, uuid[], timestamptz) to authenticated;

comment on function public.send_payer_org_message is
  'Payer staff fan-out a message to approved connected patients.';

-- ========== RPC: payer org reply ==========

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
    and c.kind = 'org_patient';

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
    select 1
    from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'user'
      and p.user_id = v_conv.patient_user_id
  );

  insert into public.message_participants (conversation_id, party_type, payer_organization_id)
  select p_conversation_id, 'organization', v_conv.payer_organization_id
  where not exists (
    select 1
    from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'organization'
      and p.payer_organization_id = v_conv.payer_organization_id
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
  set
    last_message_at = v_now,
    last_message_preview = left(v_body, 160),
    updated_at = v_now
  where id = p_conversation_id;

  update public.message_participants
  set last_read_at = v_now
  where conversation_id = p_conversation_id
    and party_type = 'organization'
    and payer_organization_id = v_conv.payer_organization_id;

  return v_row;
end;
$$;

revoke all on function public.post_payer_org_message(uuid, text) from public;
grant execute on function public.post_payer_org_message(uuid, text) to authenticated;

comment on function public.post_payer_org_message is
  'Payer staff reply in an existing payer↔patient conversation.';

-- Patient replies in payer org threads (approved connection; no messaging consent scope on patient↔payer)
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
