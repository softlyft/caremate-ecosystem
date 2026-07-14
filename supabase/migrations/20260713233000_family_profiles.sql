-- Family households, members, and spouse connection requests.
-- Personal profiles/settings/emergency remain per auth user; household shares kids + connections.

-- ========== family_households ==========
create table if not exists public.family_households (
  id text primary key,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_households enable row level security;

create index if not exists family_households_created_by_idx
  on public.family_households (created_by_user_id);

-- ========== family_members ==========
create table if not exists public.family_members (
  id text primary key,
  household_id text not null references public.family_households (id) on delete cascade,
  kind text not null check (kind in ('self', 'spouse', 'child')),
  linked_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  date_of_birth text,
  gender text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_members enable row level security;

create index if not exists family_members_household_idx on public.family_members (household_id);
create index if not exists family_members_linked_user_idx on public.family_members (linked_user_id);

-- ========== family_connection_requests ==========
create table if not exists public.family_connection_requests (
  id text primary key,
  household_id text not null references public.family_households (id) on delete cascade,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid references auth.users (id) on delete set null,
  to_email text,
  to_phone text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  invite_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_connection_requests enable row level security;

create index if not exists family_connection_requests_to_user_idx
  on public.family_connection_requests (to_user_id);
create index if not exists family_connection_requests_from_user_idx
  on public.family_connection_requests (from_user_id);

-- Helper: is current user a linked member of household?
create or replace function public.is_household_member(p_household_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members m
    where m.household_id = p_household_id
      and m.linked_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.family_households h
    where h.id = p_household_id
      and h.created_by_user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(text) from public;
grant execute on function public.is_household_member(text) to authenticated;

-- Household policies
drop policy if exists "Household members manage households" on public.family_households;
create policy "Household members manage households"
  on public.family_households for all
  using (
    created_by_user_id = auth.uid()
    or public.is_household_member(id)
  )
  with check (created_by_user_id = auth.uid());

-- Member policies
drop policy if exists "Household members manage members" on public.family_members;
create policy "Household members manage members"
  on public.family_members for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) or linked_user_id = auth.uid());

-- Allow creator insert before self member exists
drop policy if exists "Creators insert households" on public.family_households;
create policy "Creators insert households"
  on public.family_households for insert
  with check (created_by_user_id = auth.uid());

drop policy if exists "Creators insert initial members" on public.family_members;
create policy "Creators insert initial members"
  on public.family_members for insert
  with check (
    exists (
      select 1 from public.family_households h
      where h.id = household_id and h.created_by_user_id = auth.uid()
    )
    or public.is_household_member(household_id)
  );

-- Connection request policies
drop policy if exists "Users manage own connection requests" on public.family_connection_requests;
create policy "Users manage own connection requests"
  on public.family_connection_requests for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "Users insert connection requests" on public.family_connection_requests;
create policy "Users insert connection requests"
  on public.family_connection_requests for insert
  with check (from_user_id = auth.uid());

drop policy if exists "Participants update connection requests" on public.family_connection_requests;
create policy "Participants update connection requests"
  on public.family_connection_requests for update
  using (from_user_id = auth.uid() or to_user_id = auth.uid())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid());

-- ========== lookup RPC (full matching profile details) ==========
create or replace function public.lookup_user_for_family_connect(p_query text)
returns table (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  date_of_birth text,
  country_code text,
  state text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := lower(trim(p_query));
  phone_digits text := regexp_replace(p_query, '[^0-9+]', '', 'g');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if q is null or length(q) < 3 then
    return;
  end if;

  return query
  select
    p.user_id,
    p.full_name,
    p.email,
    p.phone,
    p.date_of_birth,
    p.country_code,
    p.state,
    p.avatar_url
  from public.profiles p
  where p.user_id <> auth.uid()
    and (
      (p.email is not null and lower(p.email) = q)
      or (
        phone_digits <> ''
        and p.phone is not null
        and regexp_replace(p.phone, '[^0-9+]', '', 'g') = phone_digits
      )
    )
  limit 5;
end;
$$;

revoke all on function public.lookup_user_for_family_connect(text) from public;
grant execute on function public.lookup_user_for_family_connect(text) to authenticated;

-- ========== create connection request ==========
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_household_member(p_household_id)
     and not exists (
       select 1 from public.family_households h
       where h.id = p_household_id and h.created_by_user_id = auth.uid()
     ) then
    raise exception 'Not a member of this household';
  end if;

  if p_to_user_id is not null and p_to_user_id = auth.uid() then
    raise exception 'Cannot connect to yourself';
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

-- ========== respond (accept joins household; personal data stays on each user) ==========
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

  -- Join requester's household as spouse. Personal profiles stay per-user.
  if not exists (
    select 1 from public.family_members
    where household_id = req.household_id
      and linked_user_id = auth.uid()
      and kind in ('self', 'spouse')
  ) then
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
