-- Phase B: elevate an approved connected patient to org staff + optional company fields.

alter table public.provider_org_members
  add column if not exists company_email text,
  add column if not exists company_phone text,
  add column if not exists position text;

comment on column public.provider_org_members.company_email is
  'Optional workplace email for this staff membership (portal-managed).';
comment on column public.provider_org_members.company_phone is
  'Optional workplace phone for this staff membership (portal-managed).';
comment on column public.provider_org_members.position is
  'Optional job title / position within the organization.';

-- Owners and administrators may mark an approved connected CareMate user as staff.
-- Uses security definer so administrators are not blocked by owner-only membership RLS.
create or replace function public.mark_connected_patient_as_staff(
  p_organization_id uuid,
  p_patient_user_id uuid,
  p_company_email text default null,
  p_company_phone text default null,
  p_position text default null,
  p_display_name text default null
)
returns public.provider_org_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection public.patient_provider_connections;
  v_profile public.profiles;
  v_existing public.provider_org_members;
  v_row public.provider_org_members;
  v_display text;
  v_was_active boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_organization_id is null or p_patient_user_id is null then
    raise exception 'Organization and patient are required';
  end if;

  if not (public.can_manage_provider_org(p_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if p_patient_user_id = auth.uid() then
    raise exception 'You cannot mark yourself as staff from a patient connection';
  end if;

  select * into v_connection
  from public.patient_provider_connections c
  where c.organization_id = p_organization_id
    and c.patient_id = p_patient_user_id
    and c.status = 'approved';

  if not found then
    raise exception 'Patient must have an approved connection with this organization';
  end if;

  select * into v_profile
  from public.profiles p
  where p.user_id = p_patient_user_id
  limit 1;

  v_display := nullif(btrim(coalesce(p_display_name, '')), '');
  if v_display is null and v_profile is not null then
    v_display := nullif(btrim(coalesce(v_profile.full_name, '')), '');
  end if;

  select * into v_existing
  from public.provider_org_members m
  where m.organization_id = p_organization_id
    and m.user_id = p_patient_user_id;

  if found then
    v_was_active := v_existing.deleted_at is null;

    update public.provider_org_members m
    set
      deleted_at = null,
      -- Preserve elevated roles; only set staff when restoring or previously staff/viewer.
      role = case
        when m.role in ('owner', 'administrator') then m.role
        else 'staff'
      end,
      display_name = coalesce(v_display, m.display_name),
      company_email = nullif(btrim(coalesce(p_company_email, '')), ''),
      company_phone = nullif(btrim(coalesce(p_company_phone, '')), ''),
      position = nullif(btrim(coalesce(p_position, '')), ''),
      updated_at = now()
    where m.id = v_existing.id
    returning * into v_row;
  else
    insert into public.provider_org_members (
      organization_id,
      user_id,
      role,
      display_name,
      company_email,
      company_phone,
      position
    ) values (
      p_organization_id,
      p_patient_user_id,
      'staff',
      v_display,
      nullif(btrim(coalesce(p_company_email, '')), ''),
      nullif(btrim(coalesce(p_company_phone, '')), ''),
      nullif(btrim(coalesce(p_position, '')), '')
    )
    returning * into v_row;
  end if;

  if not v_was_active then
    insert into public.patient_provider_activities (
      organization_id,
      patient_id,
      connection_id,
      event_type,
      summary,
      metadata
    ) values (
      p_organization_id,
      p_patient_user_id,
      v_connection.id,
      'marked_as_staff',
      'Marked as organization staff',
      jsonb_build_object(
        'member_id', v_row.id,
        'role', v_row.role,
        'position', v_row.position
      )
    );
  end if;

  return v_row;
end;
$$;

grant execute on function public.mark_connected_patient_as_staff(
  uuid, uuid, text, text, text, text
) to authenticated;

comment on function public.mark_connected_patient_as_staff(
  uuid, uuid, text, text, text, text
) is
  'Owner/admin: upsert provider_org_members for an approved connected patient (staff role) with optional company fields.';
