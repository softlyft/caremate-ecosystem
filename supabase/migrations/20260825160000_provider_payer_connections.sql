-- Bidirectional verified provider ↔ payer organization connections.
-- Request by claim/verification contact email; approve/reject via RLS updates.

create table if not exists public.provider_payer_connections (
  id uuid primary key default gen_random_uuid(),
  provider_organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  payer_organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  initiated_by text not null
    check (initiated_by in ('provider', 'payer')),
  provider_note text,
  payer_note text,
  rejection_reason text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_organization_id, payer_organization_id)
);

create index if not exists provider_payer_connections_provider_idx
  on public.provider_payer_connections (provider_organization_id, status);

create index if not exists provider_payer_connections_payer_idx
  on public.provider_payer_connections (payer_organization_id, status);

comment on table public.provider_payer_connections is
  'Care Portal B2B links between verified provider and payer orgs. One row per pair for life.';

alter table public.provider_payer_connections enable row level security;

revoke all on public.provider_payer_connections from anon, authenticated;
grant select, update on public.provider_payer_connections to authenticated;
grant all on public.provider_payer_connections to service_role;

-- ========== RLS ==========
create policy "Provider members read provider-payer connections"
  on public.provider_payer_connections for select to authenticated
  using (
    public.is_provider_org_member(provider_organization_id)
    or public.is_payer_org_member(payer_organization_id)
    or public.is_staff()
  );

create policy "Provider writers update pending provider-payer connections"
  on public.provider_payer_connections for update to authenticated
  using (
    status = 'pending'
    and (
      public.can_write_provider_org(provider_organization_id)
      or public.is_admin()
    )
  )
  with check (
    public.can_write_provider_org(provider_organization_id)
    or public.is_admin()
  );

create policy "Payer writers update pending provider-payer connections"
  on public.provider_payer_connections for update to authenticated
  using (
    status = 'pending'
    and (
      public.can_write_payer_org(payer_organization_id)
      or public.is_admin()
    )
  )
  with check (
    public.can_write_payer_org(payer_organization_id)
    or public.is_admin()
  );

-- ========== Helpers ==========
create or replace function public.find_verified_provider_org_id_by_claim_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_org_id uuid;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return null;
  end if;

  select po.id into v_org_id
  from public.provider_organizations po
  join public.provider_profiles pp
    on pp.organization_id = po.id
   and pp.verification_status = 'verified'
  where po.deleted_at is null
    and (
      lower(btrim(coalesce(pp.email, ''))) = v_email
      or exists (
        select 1
        from public.provider_locations pl
        where pl.organization_id = po.id
          and pl.deleted_at is null
          and lower(btrim(coalesce(pl.email, ''))) = v_email
      )
    )
  order by po.created_at asc
  limit 1;

  return v_org_id;
end;
$$;

create or replace function public.find_verified_payer_org_id_by_claim_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_org_id uuid;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return null;
  end if;

  select po.id into v_org_id
  from public.payer_organizations po
  where po.deleted_at is null
    and po.active = true
    and lower(btrim(coalesce(po.email, ''))) = v_email
    and public.is_payer_org_verified(po.id)
  order by po.created_at asc
  limit 1;

  return v_org_id;
end;
$$;

grant execute on function public.find_verified_provider_org_id_by_claim_email(text) to authenticated;
grant execute on function public.find_verified_payer_org_id_by_claim_email(text) to authenticated;

-- ========== Provider → payer ==========
create or replace function public.request_provider_payer_connection_by_email(
  p_provider_organization_id uuid,
  p_payer_claim_email text,
  p_provider_note text default null
)
returns public.provider_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid;
  v_existing public.provider_payer_connections;
  v_row public.provider_payer_connections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.can_write_provider_org(p_provider_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if not public.is_provider_org_verified(p_provider_organization_id) then
    raise exception 'Your organization must be verified before connecting';
  end if;

  v_payer_id := public.find_verified_payer_org_id_by_claim_email(p_payer_claim_email);
  if v_payer_id is null then
    raise exception 'No verified payer found with that claim contact email';
  end if;

  select * into v_existing
  from public.provider_payer_connections c
  where c.provider_organization_id = p_provider_organization_id
    and c.payer_organization_id = v_payer_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'Already connected with this payer';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    else
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    end if;
  end if;

  insert into public.provider_payer_connections (
    provider_organization_id,
    payer_organization_id,
    status,
    initiated_by,
    provider_note
  ) values (
    p_provider_organization_id,
    v_payer_id,
    'pending',
    'provider',
    nullif(btrim(coalesce(p_provider_note, '')), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ========== Payer → provider ==========
create or replace function public.request_payer_provider_connection_by_email(
  p_payer_organization_id uuid,
  p_provider_claim_email text,
  p_payer_note text default null
)
returns public.provider_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id uuid;
  v_existing public.provider_payer_connections;
  v_row public.provider_payer_connections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.can_write_payer_org(p_payer_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if not public.is_payer_org_verified(p_payer_organization_id) then
    raise exception 'Your organization must be verified before connecting';
  end if;

  v_provider_id := public.find_verified_provider_org_id_by_claim_email(p_provider_claim_email);
  if v_provider_id is null then
    raise exception 'No verified provider found with that claim contact email';
  end if;

  select * into v_existing
  from public.provider_payer_connections c
  where c.provider_organization_id = v_provider_id
    and c.payer_organization_id = p_payer_organization_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'Already connected with this provider';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    else
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    end if;
  end if;

  insert into public.provider_payer_connections (
    provider_organization_id,
    payer_organization_id,
    status,
    initiated_by,
    payer_note
  ) values (
    v_provider_id,
    p_payer_organization_id,
    'pending',
    'payer',
    nullif(btrim(coalesce(p_payer_note, '')), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.request_provider_payer_connection_by_email(uuid, text, text) to authenticated;
grant execute on function public.request_payer_provider_connection_by_email(uuid, text, text) to authenticated;
