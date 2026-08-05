-- Canonical email for uniqueness (Gmail/Googlemail dots + plus-aliases).
-- Other providers: trim + lower only.

create or replace function public.canonical_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
  local_part text;
  domain text;
  at_pos integer;
  plus_pos integer;
begin
  if p_email is null then
    return null;
  end if;

  normalized := lower(trim(p_email));
  if normalized = '' then
    return '';
  end if;

  at_pos := position('@' in normalized);
  if at_pos < 2 or at_pos = length(normalized) then
    return normalized;
  end if;

  local_part := left(normalized, at_pos - 1);
  domain := substring(normalized from at_pos + 1);

  if domain = 'googlemail.com' then
    domain := 'gmail.com';
  end if;

  if domain = 'gmail.com' then
    plus_pos := position('+' in local_part);
    if plus_pos > 0 then
      local_part := left(local_part, plus_pos - 1);
    end if;
    local_part := replace(local_part, '.', '');
  end if;

  return local_part || '@' || domain;
end;
$$;

comment on function public.canonical_email(text) is
  'Normalize email for account uniqueness. Gmail/Googlemail: strip dots and +aliases; map googlemail.com → gmail.com.';

revoke all on function public.canonical_email(text) from public;
grant execute on function public.canonical_email(text) to authenticated, service_role, anon;

-- Reject signup when another auth user already owns this mailbox (Gmail variants included).
create or replace function public.hook_reject_duplicate_canonical_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  incoming_email text;
  incoming_id uuid;
  canon text;
  conflict_exists boolean;
begin
  incoming_email := coalesce(event->'user'->>'email', '');
  if incoming_email = '' then
    return '{}'::jsonb;
  end if;

  begin
    incoming_id := nullif(event->'user'->>'id', '')::uuid;
  exception
    when others then
      incoming_id := null;
  end;

  canon := public.canonical_email(incoming_email);
  if canon is null or canon = '' or position('@' in canon) = 0 then
    return '{}'::jsonb;
  end if;

  select exists (
    select 1
    from auth.users u
    where public.canonical_email(u.email) = canon
      and (incoming_id is null or u.id <> incoming_id)
  )
  into conflict_exists;

  if conflict_exists then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'An account with this email already exists. Sign in or reset your password.',
        'http_code', 422
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

comment on function public.hook_reject_duplicate_canonical_email(jsonb) is
  'Auth before_user_created hook: block signup when a Gmail-equivalent (or exact) email already exists.';

revoke all on function public.hook_reject_duplicate_canonical_email(jsonb) from public;
grant execute on function public.hook_reject_duplicate_canonical_email(jsonb) to supabase_auth_admin;

-- Provider / admin lookup should resolve Gmail variants to the same auth user.
create or replace function public.get_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select u.id
  from auth.users u
  where public.canonical_email(u.email) = public.canonical_email(p_email)
  limit 1;
$$;

comment on function public.get_auth_user_id_by_email(text) is
  'Service-role helper: map email → auth.users.id using canonical email matching.';

-- Family connect email lookup should treat Gmail variants as the same mailbox.
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
  q_canon text := public.canonical_email(p_query);
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
    null::text,
    p.country_code,
    null::text,
    null::text
  from public.profiles p
  where p.user_id <> auth.uid()
    and (
      (
        p.email is not null
        and position('@' in q) > 0
        and public.canonical_email(p.email) = q_canon
      )
      or (
        p.email is not null
        and position('@' in q) = 0
        and lower(p.email) = q
      )
      or (
        phone_digits <> ''
        and p.phone is not null
        and regexp_replace(p.phone, '[^0-9+]', '', 'g') = phone_digits
      )
    )
  limit 5;
end;
$$;
