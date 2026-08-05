-- Messaging consent: auto-grant on connection approve, purge on reject,
-- and gate org↔ patient messaging on 'messaging' ∈ shared_scopes.

-- ========== Catalog ==========
insert into public.consent_definitions (
  code,
  organization_id,
  source,
  fhir_scope,
  fhir_category,
  fhir_policy_rule,
  data_class,
  title,
  description,
  active
)
select
  'messaging',
  null,
  'system',
  'patient-privacy',
  jsonb_build_object(
    'coding',
    jsonb_build_array(
      jsonb_build_object(
        'system', 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        'code', 'patient-privacy'
      )
    ),
    'text', 'Privacy Consent'
  ),
  'OPTIN',
  'messaging',
  'Secure messaging',
  'Two-way messages between you and this provider organization.',
  true
where not exists (
  select 1 from public.consent_definitions d
  where d.code = 'messaging' and d.organization_id is null
);

-- ========== Helpers ==========
create or replace function public.has_org_messaging_consent(
  p_organization_id uuid,
  p_patient_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_provider_connections c
    where c.organization_id = p_organization_id
      and c.patient_id = p_patient_id
      and c.status = 'approved'
      and 'messaging' = any (c.shared_scopes)
  );
$$;

comment on function public.has_org_messaging_consent(uuid, uuid) is
  'True when the patient↔org connection is approved and messaging consent is active.';

grant execute on function public.has_org_messaging_consent(uuid, uuid) to authenticated;

create or replace function public.grant_messaging_consent_for_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.patient_provider_connections%rowtype;
  v_def_id uuid;
  v_prior_id uuid;
  v_now timestamptz := now();
begin
  select * into v_conn
  from public.patient_provider_connections
  where id = p_connection_id;

  if not found or v_conn.status is distinct from 'approved' then
    return;
  end if;

  select d.id into v_def_id
  from public.consent_definitions d
  where d.code = 'messaging'
    and d.organization_id is null
    and d.active = true
  limit 1;

  if v_def_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.patient_provider_consents c
    where c.connection_id = p_connection_id
      and c.definition_id = v_def_id
      and c.status = 'active'
      and c.provision_type = 'permit'
  ) then
    return;
  end if;

  select c.id into v_prior_id
  from public.patient_provider_consents c
  where c.connection_id = p_connection_id
    and c.definition_id = v_def_id
    and c.status is distinct from 'active'
  order by c.updated_at desc
  limit 1;

  if v_prior_id is not null then
    update public.patient_provider_consents
    set
      status = 'active',
      provision_type = 'permit',
      granted_at = coalesce(v_conn.approved_at, v_now),
      revoked_at = null,
      fhir_scope = 'patient-privacy',
      purpose = 'TREAT',
      source = 'system',
      updated_at = v_now
    where id = v_prior_id;
  else
    insert into public.patient_provider_consents (
      connection_id,
      patient_id,
      organization_id,
      definition_id,
      status,
      fhir_scope,
      provision_type,
      purpose,
      granted_at,
      revoked_at,
      source
    ) values (
      v_conn.id,
      v_conn.patient_id,
      v_conn.organization_id,
      v_def_id,
      'active',
      'patient-privacy',
      'permit',
      'TREAT',
      coalesce(v_conn.approved_at, v_now),
      null,
      'system'
    );
  end if;
end;
$$;

create or replace function public.purge_messaging_consent_for_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_def_id uuid;
begin
  select d.id into v_def_id
  from public.consent_definitions d
  where d.code = 'messaging'
    and d.organization_id is null
  limit 1;

  if v_def_id is null then
    return;
  end if;

  delete from public.patient_provider_consents
  where connection_id = p_connection_id
    and definition_id = v_def_id;
end;
$$;

create or replace function public.connection_status_messaging_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.grant_messaging_consent_for_connection(new.id);
    elsif new.status = 'rejected' then
      perform public.purge_messaging_consent_for_connection(new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists patient_provider_connections_messaging_consent
  on public.patient_provider_connections;

create trigger patient_provider_connections_messaging_consent
  after update of status on public.patient_provider_connections
  for each row
  execute function public.connection_status_messaging_consent();

-- Backfill: every approved connection gets messaging consent once.
do $$
declare
  r record;
begin
  for r in
    select id
    from public.patient_provider_connections
    where status = 'approved'
  loop
    perform public.grant_messaging_consent_for_connection(r.id);
  end loop;
end;
$$;

-- ========== Direct messaging: patient side needs messaging consent ==========
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
    )
    and (
      -- Staff ↔ staff: no patient messaging consent required
      (
        public.is_org_practitioner(p_org_id, p_user_a)
        and public.is_org_practitioner(p_org_id, p_user_b)
      )
      or (
        public.is_org_practitioner(p_org_id, p_user_a)
        and public.has_org_messaging_consent(p_org_id, p_user_b)
      )
      or (
        public.is_org_practitioner(p_org_id, p_user_b)
        and public.has_org_messaging_consent(p_org_id, p_user_a)
      )
    );
$$;

-- ========== Org fan-out: only messaging-consented recipients ==========
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
      and c.status = 'approved'
      and 'messaging' = any (c.shared_scopes);
  else
    if p_patient_ids is null or cardinality(p_patient_ids) = 0 then
      raise exception 'Select at least one patient';
    end if;
    select coalesce(array_agg(c.patient_id), '{}')
      into v_recipients
    from public.patient_provider_connections c
    where c.organization_id = p_organization_id
      and c.status = 'approved'
      and 'messaging' = any (c.shared_scopes)
      and c.patient_id = any (p_patient_ids);
  end if;

  if cardinality(v_recipients) = 0 then
    raise exception 'No approved recipients with messaging consent';
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

comment on function public.send_provider_org_message is
  'Provider staff fan-out a message to approved connected patients who have active messaging consent.';

-- ========== Org reply ==========
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
    and c.kind = 'org_patient';

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.organization_id is null or v_conv.patient_user_id is null then
    raise exception 'Invalid conversation';
  end if;

  if not public.can_write_provider_org(v_conv.organization_id) and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if not public.has_org_messaging_consent(v_conv.organization_id, v_conv.patient_user_id) then
    raise exception 'Patient messaging consent required';
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

  insert into public.message_participants (conversation_id, party_type, organization_id)
  select p_conversation_id, 'organization', v_conv.organization_id
  where not exists (
    select 1
    from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'organization'
      and p.organization_id = v_conv.organization_id
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
  set
    last_message_at = v_now,
    last_message_preview = left(v_body, 160),
    updated_at = v_now
  where id = p_conversation_id;

  update public.message_participants
  set last_read_at = v_now
  where conversation_id = p_conversation_id
    and party_type = 'organization'
    and organization_id = v_conv.organization_id;

  return v_row;
end;
$$;

-- ========== Patient reply (org threads need messaging consent) ==========
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
    if not public.has_org_messaging_consent(v_conv.organization_id, auth.uid()) then
      raise exception 'Messaging consent required';
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

-- ========== RLS: patient insert on org_patient requires messaging consent ==========
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
          and public.has_org_messaging_consent(c.organization_id, auth.uid())
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
