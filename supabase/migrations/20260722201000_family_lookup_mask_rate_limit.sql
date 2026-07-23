-- Mask family-connect lookup PII and rate-limit probes.

create table if not exists public.family_connect_lookup_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists family_connect_lookup_attempts_user_time_idx
  on public.family_connect_lookup_attempts (user_id, attempted_at desc);

alter table public.family_connect_lookup_attempts enable row level security;
revoke all on public.family_connect_lookup_attempts from anon, authenticated;
grant all on public.family_connect_lookup_attempts to service_role;

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
  recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if q is null or length(q) < 3 then
    return;
  end if;

  select count(*)::integer into recent_count
  from public.family_connect_lookup_attempts a
  where a.user_id = auth.uid()
    and a.attempted_at > now() - interval '1 hour';

  if recent_count >= 30 then
    raise exception 'Too many lookup attempts. Try again later.';
  end if;

  insert into public.family_connect_lookup_attempts (user_id) values (auth.uid());

  return query
  select
    p.user_id,
    -- First token of the name only (avoid full legal name dump).
    nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''),
    case
      when p.email is null then null
      when position('@' in p.email) > 1 then
        left(p.email, 1) || '***@' || split_part(p.email, '@', 2)
      else '***'
    end,
    case
      when p.phone is null then null
      when length(regexp_replace(p.phone, '\D', '', 'g')) >= 4 then
        '***' || right(regexp_replace(p.phone, '\D', '', 'g'), 4)
      else '***'
    end,
    null::text, -- never return DOB from lookup
    p.country_code,
    null::text, -- never return state from lookup
    null::text  -- never return avatar from lookup
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
