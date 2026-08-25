-- Hide claim contact email from the public Health Insurance Directory.
-- Directory consumers use payer_directory (no email). Claim email remains on
-- payer_organizations for SoftLyft, payer members, and connected providers.

drop policy if exists "Public read active payer catalog"
  on public.payer_organizations;

revoke select on public.payer_organizations from anon;

-- Connected Care Portal providers may read catalog rows (incl. claim email) for
-- their pending/approved payer connections (inbox + connected list).
drop policy if exists "Provider members read connected payer catalog"
  on public.payer_organizations;

create policy "Provider members read connected payer catalog"
  on public.payer_organizations for select to authenticated
  using (
    exists (
      select 1
      from public.provider_payer_connections c
      where c.payer_organization_id = payer_organizations.id
        and c.status in ('pending', 'approved')
        and public.is_provider_org_member(c.provider_organization_id)
    )
  );

create or replace view public.payer_directory
with (security_invoker = false)
as
select
  id,
  name,
  phone,
  website,
  address,
  active
from public.payer_organizations
where active = true
  and deleted_at is null;

comment on view public.payer_directory is
  'Public Health Insurance Directory projection without claim contact email.';

grant select on public.payer_directory to anon, authenticated;
