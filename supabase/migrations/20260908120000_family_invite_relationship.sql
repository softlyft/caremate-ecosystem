-- Invite slots: spouse, family_1, family_2. One of each per household.

alter table public.family_connection_requests
  add column if not exists relationship text;

update public.family_connection_requests
set relationship = 'spouse'
where relationship is null;

alter table public.family_connection_requests
  alter column relationship set default 'spouse';

alter table public.family_connection_requests
  alter column relationship set not null;

alter table public.family_connection_requests
  drop constraint if exists family_connection_requests_relationship_check;

alter table public.family_connection_requests
  add constraint family_connection_requests_relationship_check
  check (relationship in ('spouse', 'family_1', 'family_2'));

alter table public.family_members
  add column if not exists relationship text;

alter table public.family_members
  drop constraint if exists family_members_relationship_check;

alter table public.family_members
  add constraint family_members_relationship_check
  check (relationship is null or relationship in ('spouse', 'family_1', 'family_2'));

-- Existing single invited adult occupies the spouse slot.
update public.family_members m
set relationship = 'spouse'
where m.kind = 'spouse'
  and m.relationship is null
  and (
    select count(*)
    from public.family_members m2
    where m2.household_id = m.household_id
      and m2.kind = 'spouse'
  ) = 1;

drop function if exists public.create_family_connection_request(text, uuid, text, text, text);

create or replace function public.create_family_connection_request(
  p_household_id text,
  p_to_user_id uuid default null,
  p_to_email text default null,
  p_to_phone text default null,
  p_invite_token text default null,
  p_relationship text default 'spouse'
)
returns public.family_connection_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.family_connection_requests;
  new_id text := gen_random_uuid()::text;
  seats_used integer;
  v_relationship text := lower(trim(coalesce(p_relationship, '')));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if v_relationship not in ('spouse', 'family_1', 'family_2') then
    raise exception 'Choose a relationship: spouse, family_1, or family_2';
  end if;

  if not exists (
    select 1
    from public.family_households h
    where h.id = p_household_id
      and h.created_by_user_id = auth.uid()
  ) then
    raise exception 'Only the Family Premium owner can invite members';
  end if;

  if p_to_user_id is not null and p_to_user_id = auth.uid() then
    raise exception 'Cannot connect to yourself';
  end if;

  if p_to_user_id is not null and exists (
    select 1
    from public.family_members m
    where m.household_id = p_household_id
      and m.linked_user_id = p_to_user_id
      and m.kind in ('self', 'spouse')
  ) then
    raise exception 'That person is already in this household';
  end if;

  if p_to_user_id is not null and exists (
    select 1
    from public.family_connection_requests r
    where r.household_id = p_household_id
      and r.to_user_id = p_to_user_id
      and r.status = 'pending'
  ) then
    raise exception 'A pending invite already exists for that person';
  end if;

  if exists (
    select 1
    from public.family_members m
    where m.household_id = p_household_id
      and m.kind = 'spouse'
      and m.relationship = v_relationship
  ) or exists (
    select 1
    from public.family_connection_requests r
    where r.household_id = p_household_id
      and r.status = 'pending'
      and r.relationship = v_relationship
  ) then
    raise exception 'That relationship is already used in this household';
  end if;

  seats_used := public.family_adult_invite_seats_used(p_household_id);
  if seats_used >= 3 then
    raise exception 'Family Premium allows up to 3 invited members';
  end if;

  insert into public.family_connection_requests (
    id, household_id, from_user_id, to_user_id, to_email, to_phone, status, invite_token, relationship
  ) values (
    new_id,
    p_household_id,
    auth.uid(),
    p_to_user_id,
    nullif(lower(trim(coalesce(p_to_email, ''))), ''),
    nullif(trim(coalesce(p_to_phone, '')), ''),
    'pending',
    p_invite_token,
    v_relationship
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.create_family_connection_request(text, uuid, text, text, text, text) from public;
grant execute on function public.create_family_connection_request(text, uuid, text, text, text, text) to authenticated;

create or replace function public.respond_family_connection_request(
  p_request_id text,
  p_accept boolean,
  p_self_full_name text default 'Family member'
)
returns public.family_connection_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.family_connection_requests;
  result public.family_connection_requests;
  seats_used integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into req
  from public.family_connection_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'Request not found';
  end if;

  if req.to_user_id is distinct from auth.uid() then
    raise exception 'Not the recipient of this request';
  end if;

  if req.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  if not p_accept then
    update public.family_connection_requests
    set status = 'declined', updated_at = now()
    where id = p_request_id
    returning * into result;
    return result;
  end if;

  if not exists (
    select 1 from public.family_members
    where household_id = req.household_id
      and linked_user_id = auth.uid()
      and kind in ('self', 'spouse')
  ) then
    seats_used := (
      select count(*)::integer
      from public.family_members m
      where m.household_id = req.household_id
        and m.kind = 'spouse'
    );
    if seats_used >= 3 then
      raise exception 'Family Premium allows up to 3 invited members';
    end if;

    insert into public.family_members (
      id, household_id, kind, linked_user_id, full_name, relationship
    ) values (
      gen_random_uuid()::text,
      req.household_id,
      'spouse',
      auth.uid(),
      coalesce(nullif(trim(p_self_full_name), ''), 'Family member'),
      req.relationship
    );
  end if;

  update public.family_connection_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;
