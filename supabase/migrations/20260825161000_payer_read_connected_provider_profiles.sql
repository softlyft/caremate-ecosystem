-- Allow payer org members to read provider profiles for orgs they have a
-- provider↔payer connection with (claim email display in Care Portal).

create policy "Payer members read connected provider profiles"
  on public.provider_profiles for select to authenticated
  using (
    exists (
      select 1
      from public.provider_payer_connections c
      where c.provider_organization_id = provider_profiles.organization_id
        and public.is_payer_org_member(c.payer_organization_id)
    )
  );
