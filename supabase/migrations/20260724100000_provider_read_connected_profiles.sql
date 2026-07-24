-- Provider portal lists connected patients by joining profiles.user_id ← connections.patient_id.
-- Profiles were previously own-row only, so staff always saw full_name as null → UI "Unknown".

create policy "Provider members read connected patient profiles"
  on public.profiles
  for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.patient_provider_connections c
      where c.patient_id = profiles.user_id
        and public.is_provider_org_member(c.organization_id)
    )
  );

-- Patient detail shows emergency card when shared_scopes includes emergency.
create policy "Provider members read shared emergency profiles"
  on public.emergency_profiles
  for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.patient_provider_connections c
      where c.patient_id = emergency_profiles.user_id
        and c.status = 'approved'
        and 'emergency' = any (c.shared_scopes)
        and public.is_provider_org_member(c.organization_id)
    )
  );
