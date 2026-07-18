-- Separate payment transactions from subscription entitlements.
-- payments  = money moved (Paystack / Stripe charge)
-- subscriptions = entitlement after a successful payment

-- ========== payments ==========
create table if not exists public.payments (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  household_id text references public.family_households (id) on delete set null,
  subscription_id text,
  plan_type text not null check (plan_type in ('personal', 'family')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null check (currency in ('NGN', 'USD')),
  provider text not null check (provider in ('paystack', 'stripe')),
  amount_minor integer not null check (amount_minor >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'abandoned')),
  provider_reference text not null,
  provider_transaction_id text,
  provider_customer_id text,
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_provider_reference_idx on public.payments (provider_reference);

alter table public.payments enable row level security;

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments"
  on public.payments for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
  );

revoke insert, update, delete on public.payments from authenticated, anon;

-- Link subscriptions ↔ payments (subscription created only after payment succeeds)
alter table public.subscriptions
  add column if not exists payment_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_payment_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_payment_id_fkey
      foreign key (payment_id) references public.payments (id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_subscription_id_fkey'
  ) then
    alter table public.payments
      add constraint payments_subscription_id_fkey
      foreign key (subscription_id) references public.subscriptions (id) on delete set null;
  end if;
end $$;

create index if not exists subscriptions_payment_id_idx on public.subscriptions (payment_id);

-- Legacy checkout rows that never completed are not real entitlements.
-- Keep them queryable but mark abandoned so subscriber lists stay clean.
update public.subscriptions
set
  status = 'canceled',
  updated_at = now()
where status = 'incomplete'
  and current_period_start is null
  and current_period_end is null;
