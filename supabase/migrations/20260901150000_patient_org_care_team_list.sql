-- Patient-visible care team roster for connected provider / payer orgs.

create or replace function public.list_connected_org_care_team(
  p_org_kind text,
  p_org_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  position text,
  can_message boolean
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
      public.can_direct_message(p_org_id, v_uid, m.user_id) as can_message
    from public.provider_org_members m
    left join public.profiles p on p.user_id = m.user_id
    where m.organization_id = p_org_id
      and m.deleted_at is null
      and m.private_care_team = true
      and m.role in ('owner', 'administrator', 'staff')
    order by 2 asc nulls last;

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
    false as can_message
  from public.payer_org_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.organization_id = p_org_id
    and m.deleted_at is null
    and m.support_team = true
    and m.role in ('owner', 'administrator', 'staff')
  order by 2 asc nulls last;
end;
$$;

comment on function public.list_connected_org_care_team(text, uuid) is
  'Lists Private Care Team (provider) or Support Team (payer) members for an approved patient connection.';

revoke all on function public.list_connected_org_care_team(text, uuid) from public;
grant execute on function public.list_connected_org_care_team(text, uuid) to authenticated;
