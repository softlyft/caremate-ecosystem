-- Marketing site: read active org plan catalog (prices + limits) without auth.
-- Same rows SoftLyft admin edits and checkout edge functions charge against.

grant select on public.provider_org_plan_prices to anon;
grant select on public.payer_org_plan_prices to anon;

drop policy if exists "Anon read active provider_org_plan_prices"
  on public.provider_org_plan_prices;
create policy "Anon read active provider_org_plan_prices"
  on public.provider_org_plan_prices for select
  to anon
  using (is_active = true);

drop policy if exists "Anon read active payer_org_plan_prices"
  on public.payer_org_plan_prices;
create policy "Anon read active payer_org_plan_prices"
  on public.payer_org_plan_prices for select
  to anon
  using (is_active = true);
