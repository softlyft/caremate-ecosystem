-- Fix care coordination start: server-side source lookup, consent-aligned candidates.

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

create or replace function public.start_care_coordination_from_source(
  p_source_conversation_id uuid,
  p_other_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.message_conversations;
  v_provider_org uuid;
  v_payer_org uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_other_organization_id is null then
    raise exception 'Organization is required';
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

  if not exists (
    select 1
    from public.list_care_coordination_candidates(p_source_conversation_id) c
    where c.organization_id = p_other_organization_id
  ) then
    raise exception 'Organization is not eligible for care coordination';
  end if;

  if v_conv.organization_id is not null and v_conv.payer_organization_id is null then
    v_provider_org := v_conv.organization_id;
    v_payer_org := p_other_organization_id;
  elsif v_conv.payer_organization_id is not null and v_conv.organization_id is null then
    v_payer_org := v_conv.payer_organization_id;
    v_provider_org := p_other_organization_id;
  else
    raise exception 'Invalid source conversation';
  end if;

  return public.start_care_coordination_conversation(v_provider_org, v_payer_org);
end;
$$;

revoke all on function public.start_care_coordination_from_source(uuid, uuid) from public;
grant execute on function public.start_care_coordination_from_source(uuid, uuid) to authenticated;

comment on function public.start_care_coordination_from_source is
  'Patient starts or reopens a care coordination thread from an org_patient source thread.';
