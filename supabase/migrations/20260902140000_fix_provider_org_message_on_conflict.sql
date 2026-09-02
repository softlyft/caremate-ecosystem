-- send_provider_org_message ON CONFLICT must match message_conversations_provider_org_patient_uidx
-- (added in 20260828100000 with predicate organization_id is not null).
-- Mismatch caused Postgres 42P10 on broadcast send.

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
      where kind = 'org_patient' and organization_id is not null
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
