-- Single-thread org reply for two-way chat (broadcast fan-out stays on send_provider_org_message).

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

  insert into public.patient_provider_activities (
    organization_id,
    patient_id,
    event_type,
    summary,
    metadata
  )
  values (
    v_conv.organization_id,
    v_conv.patient_user_id,
    'message_sent',
    left(format('Message: %s', left(v_body, 120)), 200),
    jsonb_build_object(
      'message_id', v_row.id,
      'conversation_id', p_conversation_id,
      'reply', true
    )
  );

  return v_row;
end;
$$;

revoke all on function public.post_org_message(uuid, text) from public;
grant execute on function public.post_org_message(uuid, text) to authenticated;

comment on function public.post_org_message is
  'Provider staff reply in an existing org↔patient conversation (two-way chat).';
