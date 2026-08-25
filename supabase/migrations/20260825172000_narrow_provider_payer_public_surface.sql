-- Narrow public surface for "supported insurers":
-- drop full-row anon/authenticated SELECT of approved connections;
-- expose only provider↔payer ids (+ approved_at) via a security-definer RPC.

drop policy if exists "Public read approved provider-payer connections"
  on public.provider_payer_connections;

revoke select on public.provider_payer_connections from anon;

create or replace function public.list_approved_payer_org_ids_for_provider(
  p_provider_organization_id uuid
)
returns table (
  payer_organization_id uuid,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.payer_organization_id, c.approved_at
  from public.provider_payer_connections c
  where c.provider_organization_id = p_provider_organization_id
    and c.status = 'approved'
  order by c.approved_at nulls last, c.payer_organization_id;
$$;

comment on function public.list_approved_payer_org_ids_for_provider(uuid) is
  'Public directory helper: approved payer org ids for a provider (no notes).';

revoke all on function public.list_approved_payer_org_ids_for_provider(uuid) from public;
grant execute on function public.list_approved_payer_org_ids_for_provider(uuid)
  to anon, authenticated;

-- Payer members may only read provider_profiles for *approved* connections
drop policy if exists "Payer members read connected provider profiles"
  on public.provider_profiles;

create policy "Payer members read approved connected provider profiles"
  on public.provider_profiles for select to authenticated
  using (
    exists (
      select 1
      from public.provider_payer_connections c
      where c.provider_organization_id = provider_profiles.organization_id
        and c.status = 'approved'
        and public.is_payer_org_member(c.payer_organization_id)
    )
  );
