-- Web Premium: Paystack for both NGN and USD (Stripe checkout retired).
-- Mobile store IAP remains apple/google. Legacy stripe payment/subscription rows may remain.

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.subscription_prices'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%currency%provider%';
  if constraint_name is not null then
    execute format('alter table public.subscription_prices drop constraint %I', constraint_name);
  end if;
end $$;

update public.subscription_prices
set
  provider = 'paystack',
  stripe_price_id = null,
  updated_at = now()
where currency = 'USD'
  and provider = 'stripe';

alter table public.subscription_prices
  add constraint subscription_prices_currency_provider_check
  check (
    (currency = 'NGN' and provider = 'paystack')
    or (currency = 'USD' and provider = 'paystack')
  );

alter table public.subscriptions
  drop constraint if exists subscriptions_currency_provider_check;

alter table public.subscriptions
  add constraint subscriptions_currency_provider_check
  check (
    (provider = 'admin')
    or (provider = 'apple')
    or (provider = 'google')
    or (currency = 'NGN' and provider = 'paystack')
    or (currency = 'USD' and provider = 'paystack')
    or (currency = 'USD' and provider = 'stripe')
  );
