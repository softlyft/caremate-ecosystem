-- Patient opens (or resumes) the org inbox thread shown in Care Portal Messages.
-- Care team owner/admin "Message" uses this instead of a staff direct DM.

create or replace function public.open_patient_org_conversation(
  p_org_kind text,
  p_org_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text := lower(trim(coalesce(p_org_kind, '')));
  v_conv_id uuid;
  v_now timestamptz := now();
  v_created boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_kind not in ('provider', 'payer') then
    raise exception 'Invalid org kind';
  end if;

  if v_kind = 'provider' then
    if not public.has_org_messaging_consent(p_org_id, v_uid) then
      raise exception 'Messaging consent required';
    end if;

    insert into public.message_conversations (
      kind,
      organization_id,
      patient_user_id,
      created_at,
      updated_at
    )
    values (
      'org_patient',
      p_org_id,
      v_uid,
      v_now,
      v_now
    )
    on conflict (organization_id, patient_user_id)
      where kind = 'org_patient' and organization_id is not null
    do update set
      updated_at = excluded.updated_at
    returning id, (xmax = 0) into v_conv_id, v_created;
  else
    if not exists (
      select 1
      from public.patient_payer_connections c
      where c.payer_organization_id = p_org_id
        and c.patient_id = v_uid
        and c.status = 'approved'
    ) then
      raise exception 'Not connected to this payer';
    end if;

    insert into public.message_conversations (
      kind,
      payer_organization_id,
      patient_user_id,
      created_at,
      updated_at
    )
    values (
      'org_patient',
      p_org_id,
      v_uid,
      v_now,
      v_now
    )
    on conflict (payer_organization_id, patient_user_id)
      where kind = 'org_patient' and payer_organization_id is not null
    do update set
      updated_at = excluded.updated_at
    returning id, (xmax = 0) into v_conv_id, v_created;
  end if;

  if v_conv_id is null then
    raise exception 'Could not open organization conversation';
  end if;

  insert into public.message_participants (conversation_id, party_type, user_id)
  select v_conv_id, 'user', v_uid
  where not exists (
    select 1
    from public.message_participants p
    where p.conversation_id = v_conv_id
      and p.party_type = 'user'
      and p.user_id = v_uid
  );

  if v_kind = 'provider' then
    insert into public.message_participants (conversation_id, party_type, organization_id)
    select v_conv_id, 'organization', p_org_id
    where not exists (
      select 1
      from public.message_participants p
      where p.conversation_id = v_conv_id
        and p.party_type = 'organization'
        and p.organization_id = p_org_id
    );
  else
    insert into public.message_participants (conversation_id, party_type, payer_organization_id)
    select v_conv_id, 'organization', p_org_id
    where not exists (
      select 1
      from public.message_participants p
      where p.conversation_id = v_conv_id
        and p.party_type = 'organization'
        and p.payer_organization_id = p_org_id
    );
  end if;

  return jsonb_build_object(
    'conversation_id', v_conv_id,
    'created', v_created
  );
end;
$$;

revoke all on function public.open_patient_org_conversation(text, uuid) from public;
grant execute on function public.open_patient_org_conversation(text, uuid) to authenticated;

comment on function public.open_patient_org_conversation is
  'Patient finds or creates the org_patient inbox thread for a connected provider or payer org.';

-- Care team roster: owner/admin open org inbox; practitioners use direct DM.
drop function if exists public.list_connected_org_care_team(text, uuid);

create function public.list_connected_org_care_team(
  p_org_kind text,
  p_org_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  "position" text,
  can_message boolean,
  message_via_org_inbox boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text := lower(trim(coalesce(p_org_kind, '')));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_kind not in ('provider', 'payer') then
    raise exception 'Invalid org kind';
  end if;

  if v_kind = 'provider' then
    if not exists (
      select 1
      from public.patient_provider_connections c
      where c.organization_id = p_org_id
        and c.patient_id = v_uid
        and c.status = 'approved'
    ) then
      raise exception 'Not connected to this provider';
    end if;

    return query
    select
      m.user_id,
      coalesce(
        nullif(trim(m.display_name), ''),
        nullif(trim(p.full_name), ''),
        'Care team member'
      ) as display_name,
      nullif(trim(m.position), '') as position,
      case
        when m.role in ('owner', 'administrator') then
          public.has_org_messaging_consent(p_org_id, v_uid)
        else
          public.can_direct_message(p_org_id, v_uid, m.user_id)
      end as can_message,
      (m.role in ('owner', 'administrator')) as message_via_org_inbox
    from public.provider_org_members m
    left join public.profiles p on p.user_id = m.user_id
    where m.organization_id = p_org_id
      and m.deleted_at is null
      and m.role in ('owner', 'administrator', 'staff')
      and (
        m.role in ('owner', 'administrator')
        or (
          m.private_care_team = true
          and coalesce(p.is_health_practitioner, false) = true
        )
      )
    order by
      case m.role
        when 'owner' then 0
        when 'administrator' then 1
        else 2
      end,
      2 asc nulls last;

    return;
  end if;

  if not exists (
    select 1
    from public.patient_payer_connections c
    where c.payer_organization_id = p_org_id
      and c.patient_id = v_uid
      and c.status = 'approved'
  ) then
    raise exception 'Not connected to this insurer';
  end if;

  return query
  select
    m.user_id,
    coalesce(
      nullif(trim(m.display_name), ''),
      nullif(trim(p.full_name), ''),
      'Support team member'
    ) as display_name,
    null::text as position,
    case
      when m.role in ('owner', 'administrator') then true
      else public.can_payer_direct_message(p_org_id, v_uid, m.user_id)
    end as can_message,
    (m.role in ('owner', 'administrator')) as message_via_org_inbox
  from public.payer_org_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.organization_id = p_org_id
    and m.deleted_at is null
    and m.role in ('owner', 'administrator', 'staff')
    and (
      m.role in ('owner', 'administrator')
      or m.support_team = true
    )
  order by
    case m.role
      when 'owner' then 0
      when 'administrator' then 1
      else 2
    end,
    2 asc nulls last;
end;
$$;

revoke all on function public.list_connected_org_care_team(text, uuid) from public;
grant execute on function public.list_connected_org_care_team(text, uuid) to authenticated;

comment on function public.list_connected_org_care_team(text, uuid) is
  'Lists care/support team members; owner/admin message opens org inbox thread.';
