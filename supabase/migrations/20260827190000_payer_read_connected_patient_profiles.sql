-- Payer portal lists patient connection requests by joining
-- profiles.user_id ← patient_payer_connections.patient_id.
-- Profiles were own-row + provider-connected only, so payer staff saw
-- full_name as null → UI "Unknown" / "—" (date + status still rendered).

create policy "Payer members read connected patient profiles"
  on public.profiles
  for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.patient_payer_connections c
      where c.patient_id = profiles.user_id
        and public.is_payer_org_member(c.payer_organization_id)
    )
  );
