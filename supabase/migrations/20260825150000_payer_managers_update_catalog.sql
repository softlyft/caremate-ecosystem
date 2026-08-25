-- Allow claimed payer owners/admins to update their own catalog contact fields
-- (phone, website, address). SoftLyft retains create/archive via can_edit_catalog.

create policy "Payer managers update own catalog org"
  on public.payer_organizations for update to authenticated
  using (public.can_manage_payer_org(id))
  with check (public.can_manage_payer_org(id));
