-- Align billing tables with app/types: rename reserved "interval" → billing_interval.
-- Safe if the corrected 20260714180000 migration already used billing_interval.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscription_prices'
      and column_name = 'interval'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscription_prices'
      and column_name = 'billing_interval'
  ) then
    alter table public.subscription_prices rename column "interval" to billing_interval;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'interval'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'billing_interval'
  ) then
    alter table public.subscriptions rename column "interval" to billing_interval;
  end if;
end $$;

-- Re-seed if the table exists but is empty (e.g. failed insert against reserved column).
insert into public.subscription_prices (
  id, plan_type, billing_interval, currency, amount_minor, provider, is_active
) values
  ('price_personal_monthly_ngn', 'personal', 'monthly', 'NGN', 250000, 'paystack', true),
  ('price_personal_yearly_ngn',  'personal', 'yearly',  'NGN', 2500000, 'paystack', true),
  ('price_family_monthly_ngn',   'family',   'monthly', 'NGN', 450000, 'paystack', true),
  ('price_family_yearly_ngn',    'family',   'yearly',  'NGN', 4500000, 'paystack', true),
  ('price_personal_monthly_usd', 'personal', 'monthly', 'USD', 499, 'stripe', true),
  ('price_personal_yearly_usd',  'personal', 'yearly',  'USD', 4999, 'stripe', true),
  ('price_family_monthly_usd',   'family',   'monthly', 'USD', 999, 'stripe', true),
  ('price_family_yearly_usd',    'family',   'yearly',  'USD', 9999, 'stripe', true)
on conflict (plan_type, billing_interval, currency) do nothing;
