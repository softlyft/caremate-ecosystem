-- Allow Apple IAP and Google Play Billing as subscription/payment providers.

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('paystack', 'stripe', 'admin', 'apple', 'google'));

alter table public.payments
  drop constraint if exists payments_provider_check;

alter table public.payments
  add constraint payments_provider_check
  check (provider in ('paystack', 'stripe', 'apple', 'google'));

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.subscriptions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%currency%provider%';
  if constraint_name is not null then
    execute format('alter table public.subscriptions drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.subscriptions
  add constraint subscriptions_currency_provider_check
  check (
    (provider = 'admin')
    or (provider = 'apple')
    or (provider = 'google')
    or (currency = 'NGN' and provider = 'paystack')
    or (currency = 'USD' and provider = 'stripe')
  );
