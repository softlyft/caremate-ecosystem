-- Care team chat start: upsert coordination thread + idempotent participants.
-- Also align candidate listing with messaging consent required at start time.

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

-- Backfill messaging scope on approved provider connections missing messaging consent.
do $$
declare
  r record;
begin
  for r in
    select c.id
    from public.patient_provider_connections c
    where c.status = 'approved'
      and not ('messaging' = any (c.shared_scopes))
  loop
    perform public.grant_messaging_consent_for_connection(r.id);
  end loop;
end;
$$;
