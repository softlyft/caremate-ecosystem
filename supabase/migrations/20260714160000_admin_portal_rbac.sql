-- CareMate admin portal: staff roles, catalog RLS lockdown, health_tips, audit, storage, provider stub RPC.

-- ========== Role helpers (JWT app_metadata.role) ==========
create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', '')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.jwt_role() in ('admin', 'editor', 'support');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.jwt_role() = 'admin';
$$;

create or replace function public.can_edit_catalog()
returns boolean
language sql
stable
as $$
  select public.jwt_role() in ('admin', 'editor');
$$;

grant execute on function public.jwt_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_edit_catalog() to authenticated;

-- ========== Tighten articles catalog writes to staff ==========
drop policy if exists "Authenticated insert articles" on public.articles;
drop policy if exists "Authenticated upsert articles" on public.articles;
drop policy if exists "Authenticated update articles" on public.articles;

create policy "Staff insert articles"
  on public.articles for insert
  to authenticated
  with check (public.can_edit_catalog());

create policy "Staff update articles"
  on public.articles for update
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

drop policy if exists "Staff delete articles" on public.articles;
create policy "Staff delete articles"
  on public.articles for delete
  to authenticated
  using (public.can_edit_catalog());

-- ========== Tighten providers catalog; keep mobile favorite stubs via RPC ==========
drop policy if exists "Authenticated upsert providers" on public.providers;
drop policy if exists "Authenticated update providers" on public.providers;

create policy "Staff insert providers"
  on public.providers for insert
  to authenticated
  with check (public.can_edit_catalog());

create policy "Staff update providers"
  on public.providers for update
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

drop policy if exists "Staff delete providers" on public.providers;
create policy "Staff delete providers"
  on public.providers for delete
  to authenticated
  using (public.can_edit_catalog());

-- Mobile favorite sync: authenticated users may ensure a catalog stub exists without full CMS write.
create or replace function public.ensure_provider_catalog_stub(
  p_id text,
  p_name text,
  p_type text,
  p_address text default null,
  p_phone text default null,
  p_email text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_distance_km double precision default null,
  p_attributes jsonb default '{}'::jsonb,
  p_updated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.providers (
    id, name, type, address, phone, email, latitude, longitude, distance_km, attributes, updated_at
  )
  values (
    p_id, p_name, p_type, p_address, p_phone, p_email, p_latitude, p_longitude, p_distance_km,
    coalesce(p_attributes, '{}'::jsonb), coalesce(p_updated_at, now())
  )
  on conflict (id) do update set
    -- Only fill empty stub fields; never overwrite staff-managed catalog rows' core identity unnecessarily.
    name = excluded.name,
    type = excluded.type,
    address = coalesce(public.providers.address, excluded.address),
    phone = coalesce(public.providers.phone, excluded.phone),
    email = coalesce(public.providers.email, excluded.email),
    latitude = coalesce(public.providers.latitude, excluded.latitude),
    longitude = coalesce(public.providers.longitude, excluded.longitude),
    distance_km = coalesce(public.providers.distance_km, excluded.distance_km),
    attributes = case
      when public.providers.attributes = '{}'::jsonb then excluded.attributes
      else public.providers.attributes
    end,
    updated_at = greatest(public.providers.updated_at, excluded.updated_at);
end;
$$;

grant execute on function public.ensure_provider_catalog_stub(
  text, text, text, text, text, text, double precision, double precision, double precision, jsonb, timestamptz
) to authenticated;

-- ========== health_tips ==========
create table if not exists public.health_tips (
  id text primary key,
  category_id text not null,
  body text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.health_tips enable row level security;

create index if not exists health_tips_category_id_idx on public.health_tips (category_id);

drop policy if exists "Authenticated read health_tips" on public.health_tips;
create policy "Authenticated read health_tips"
  on public.health_tips for select
  to authenticated
  using (true);

drop policy if exists "Staff insert health_tips" on public.health_tips;
create policy "Staff insert health_tips"
  on public.health_tips for insert
  to authenticated
  with check (public.can_edit_catalog());

drop policy if exists "Staff update health_tips" on public.health_tips;
create policy "Staff update health_tips"
  on public.health_tips for update
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

drop policy if exists "Staff delete health_tips" on public.health_tips;
create policy "Staff delete health_tips"
  on public.health_tips for delete
  to authenticated
  using (public.can_edit_catalog());

-- ========== admin_audit_events ==========
create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_events enable row level security;

create index if not exists admin_audit_events_created_at_idx on public.admin_audit_events (created_at desc);

drop policy if exists "Staff read audit events" on public.admin_audit_events;
create policy "Staff read audit events"
  on public.admin_audit_events for select
  to authenticated
  using (public.is_staff());

-- Inserts happen via service role from the portal; no authenticated insert policy.

-- ========== Storage: learn-media ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learn-media',
  'learn-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Public read learn-media" on storage.objects;
create policy "Public read learn-media"
  on storage.objects for select
  using (bucket_id = 'learn-media');

drop policy if exists "Staff upload learn-media" on storage.objects;
create policy "Staff upload learn-media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'learn-media' and public.can_edit_catalog());

drop policy if exists "Staff update learn-media" on storage.objects;
create policy "Staff update learn-media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'learn-media' and public.can_edit_catalog())
  with check (bucket_id = 'learn-media' and public.can_edit_catalog());

drop policy if exists "Staff delete learn-media" on storage.objects;
create policy "Staff delete learn-media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'learn-media' and public.can_edit_catalog());

-- Staff read for support oversight (profiles metadata only — already own-row for users).
-- Service role bypasses RLS for Auth Admin + cross-user profile joins in the portal.
