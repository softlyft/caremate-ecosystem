-- Allow SoftLyft catalog editors (admin + editor) to manage payer_organizations,
-- matching provider catalog RLS via can_edit_catalog().

drop policy if exists "Staff manage payer catalog" on public.payer_organizations;

create policy "Catalog editors manage payer catalog"
  on public.payer_organizations for all to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

grant select, insert, update on public.payer_organizations to authenticated;
