-- Gate care-coordination (group chat) on payer Pro group_chat_enabled.
-- Patients may not call payer_org_entitlements (membership assert), so read the flag via a dedicated helper.

create or replace function public.payer_org_has_group_chat(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.group_chat_enabled
      from public.payer_org_subscriptions s
      where s.organization_id = p_org_id
        and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end > now())
      order by
        case s.plan_tier
          when 'enterprise' then 3
          when 'pro' then 2
          when 'basic' then 1
          else 0
        end desc,
        s.created_at desc
      limit 1
    ),
    false
  );
$$;

comment on function public.payer_org_has_group_chat(uuid) is
  'True when the payer org has an active entitlement with group_chat_enabled (Pro+). Free/Basic = false.';

revoke all on function public.payer_org_has_group_chat(uuid) from public;
grant execute on function public.payer_org_has_group_chat(uuid) to authenticated;

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

  if not public.payer_org_has_group_chat(p_payer_organization_id) then
    raise exception 'Care team group chat requires the payer organization Pro plan';
  end if;

  insert into public.message_conversations as mc (
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
  on conflict (patient_user_id, organization_id, payer_organization_id)
    where kind = 'care_coordination'
  do update set
    updated_at = excluded.updated_at
  returning id, (xmax = 0) into v_conv_id, v_created;

  if v_conv_id is null then
    raise exception 'Could not open care coordination conversation';
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

  insert into public.message_participants (conversation_id, party_type, organization_id)
  select v_conv_id, 'organization', p_provider_organization_id
  where not exists (
    select 1
    from public.message_participants p
    where p.conversation_id = v_conv_id
      and p.party_type = 'organization'
      and p.organization_id = p_provider_organization_id
  );

  insert into public.message_participants (conversation_id, party_type, payer_organization_id)
  select v_conv_id, 'organization', p_payer_organization_id
  where not exists (
    select 1
    from public.message_participants p
    where p.conversation_id = v_conv_id
      and p.party_type = 'organization'
      and p.payer_organization_id = p_payer_organization_id
  );

  return jsonb_build_object(
    'conversation_id', v_conv_id,
    'created', v_created
  );
end;
$$;

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
    and (
      c.patient_user_id = v_uid
      or public.is_message_conversation_participant(c.id, v_uid)
    );

  if not found then
    raise exception 'Conversation not found';
  end if;

  -- From provider Messages: list linked payers that have Pro group chat.
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
      and public.has_org_messaging_consent(v_conv.organization_id, v_uid)
      and public.payer_org_has_group_chat(l.payer_organization_id)
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

  -- From payer Messages: list linked providers only when this payer has group chat.
  if v_conv.payer_organization_id is not null and v_conv.organization_id is null then
    if not public.payer_org_has_group_chat(v_conv.payer_organization_id) then
      return;
    end if;

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
      and public.has_org_messaging_consent(l.provider_organization_id, v_uid)
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
