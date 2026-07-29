-- Allow catalog staff (admin|editor) to upsert provider_profiles for claim-email sync.
-- Also keep existing manager/admin paths.

drop policy if exists "Provider managers update own org profile" on public.provider_profiles;
create policy "Provider managers update own org profile"
  on public.provider_profiles for update
  to authenticated
  using (
    public.can_manage_provider_org(organization_id)
    or public.is_admin()
    or public.can_edit_catalog()
  )
  with check (
    public.can_manage_provider_org(organization_id)
    or public.is_admin()
    or public.can_edit_catalog()
  );

drop policy if exists "Provider managers insert org profile" on public.provider_profiles;
create policy "Provider managers insert org profile"
  on public.provider_profiles for insert
  to authenticated
  with check (
    public.can_manage_provider_org(organization_id)
    or public.is_admin()
    or public.can_edit_catalog()
  );
