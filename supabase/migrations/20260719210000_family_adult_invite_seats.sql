-- Family Premium: up to 3 invited adults (excl. owner); owner-only invite/remove.

create or replace function public.family_adult_invite_seats_used(p_household_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(*)::integer
    from public.family_members m
    where m.household_id = p_household_id
      and m.kind = 'spouse'
  ) + (
    select count(*)::integer
    from public.family_connection_requests r
    where r.household_id = p_household_id
      and r.status = 'pending'
  );
$$;

revoke all on function public.family_adult_invite_seats_used(text) from public;
grant execute on function public.family_adult_invite_seats_used(text) to authenticated;

create or replace function public.create_family_connection_request(
  p_household_id text,
  p_to_user_id uuid default null,
  p_to_email text default null,
  p_to_phone text default null,
  p_invite_token text default null
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
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

  seats_used := public.family_adult_invite_seats_used(p_household_id);
  if seats_used >= 3 then
    raise exception 'Family Premium allows up to 3 invited members';
  end if;

  insert into public.family_connection_requests (
    id, household_id, from_user_id, to_user_id, to_email, to_phone, status, invite_token
  ) values (
    new_id,
    p_household_id,
    auth.uid(),
    p_to_user_id,
    nullif(lower(trim(coalesce(p_to_email, ''))), ''),
    nullif(trim(coalesce(p_to_phone, '')), ''),
    'pending',
    p_invite_token
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.create_family_connection_request(text, uuid, text, text, text) from public;
grant execute on function public.create_family_connection_request(text, uuid, text, text, text) to authenticated;

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

  -- Accept: join requester's household as invited adult (kind=spouse in schema).
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
      id, household_id, kind, linked_user_id, full_name
    ) values (
      gen_random_uuid()::text,
      req.household_id,
      'spouse',
      auth.uid(),
      coalesce(nullif(trim(p_self_full_name), ''), 'Family member')
    );
  end if;

  update public.family_connection_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.respond_family_connection_request(text, boolean, text) from public;
grant execute on function public.respond_family_connection_request(text, boolean, text) to authenticated;

create or replace function public.cancel_family_connection_request(p_request_id text)
returns public.family_connection_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.family_connection_requests;
  result public.family_connection_requests;
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

  if req.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  if not exists (
    select 1
    from public.family_households h
    where h.id = req.household_id
      and h.created_by_user_id = auth.uid()
  ) then
    raise exception 'Only the Family Premium owner can cancel invites';
  end if;

  update public.family_connection_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.cancel_family_connection_request(text) from public;
grant execute on function public.cancel_family_connection_request(text) to authenticated;

create or replace function public.remove_family_adult_member(p_member_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member public.family_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into member
  from public.family_members
  where id = p_member_id
  for update;

  if member.id is null then
    raise exception 'Member not found';
  end if;

  if member.kind <> 'spouse' then
    raise exception 'Only invited adult members can be removed this way';
  end if;

  if not exists (
    select 1
    from public.family_households h
    where h.id = member.household_id
      and h.created_by_user_id = auth.uid()
  ) then
    raise exception 'Only the Family Premium owner can remove members';
  end if;

  delete from public.family_members
  where id = p_member_id;
end;
$$;

revoke all on function public.remove_family_adult_member(text) from public;
grant execute on function public.remove_family_adult_member(text) to authenticated;
