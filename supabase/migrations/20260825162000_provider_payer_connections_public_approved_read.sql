-- Directory: patients (and guests) can see which payers a provider supports.
-- Pending/rejected rows stay member-only via existing policies.

grant select on public.provider_payer_connections to anon;

create policy "Public read approved provider-payer connections"
  on public.provider_payer_connections for select to anon, authenticated
  using (status = 'approved');
