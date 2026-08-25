-- Allow patients / guests to browse the active health insurance (payer) directory.

create policy "Public read active payer catalog"
  on public.payer_organizations for select to anon, authenticated
  using (active = true and deleted_at is null);

grant select on public.payer_organizations to anon;
