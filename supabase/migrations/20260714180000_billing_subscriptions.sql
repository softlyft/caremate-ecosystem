-- Billing: portal-configurable Premium prices + user/household subscriptions.
-- Providers: NGN → Paystack, USD → Stripe. Intervals: monthly | yearly.
-- Plans: personal (per user) | family (per household).
-- Note: column is billing_interval (not "interval") — "interval" is a Postgres type name.

-- ========== subscription_prices ==========
create table if not exists public.subscription_prices (
  id text primary key,
  plan_type text not null check (plan_type in ('personal', 'family')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null check (currency in ('NGN', 'USD')),
  amount_minor integer not null check (amount_minor >= 0),
  provider text not null check (provider in ('paystack', 'stripe')),
  stripe_price_id text,
  paystack_plan_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_type, billing_interval, currency),
  check (
    (currency = 'NGN' and provider = 'paystack')
    or (currency = 'USD' and provider = 'stripe')
  )
);

alter table public.subscription_prices enable row level security;

drop policy if exists "Authenticated read active subscription_prices" on public.subscription_prices;
create policy "Authenticated read active subscription_prices"
  on public.subscription_prices for select
  to authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Admins manage subscription_prices" on public.subscription_prices;
create policy "Admins manage subscription_prices"
  on public.subscription_prices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ========== subscriptions ==========
create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  household_id text references public.family_households (id) on delete set null,
  plan_type text not null check (plan_type in ('personal', 'family')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null check (currency in ('NGN', 'USD')),
  provider text not null check (provider in ('paystack', 'stripe')),
  status text not null default 'incomplete'
    check (status in ('active', 'past_due', 'canceled', 'expired', 'incomplete', 'trialing')),
  provider_customer_id text,
  provider_subscription_id text,
  provider_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (plan_type = 'personal' and household_id is null)
    or (plan_type = 'family' and household_id is not null)
  )
);

alter table public.subscriptions enable row level security;

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_household_id_idx on public.subscriptions (household_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_provider_ref_idx on public.subscriptions (provider_ref);

-- Owners read their own subscriptions
drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      household_id is not null
      and public.is_household_member(household_id)
    )
    or public.is_staff()
  );

-- No client writes — Edge Functions use service role
revoke insert, update, delete on public.subscriptions from authenticated, anon;

-- ========== Seed default prices (editable in portal) ==========
-- amount_minor: NGN kobo, USD cents
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
