-- Allow clearing session tokens after a handoff code is consumed (defense in depth).

alter table public.checkout_handoffs
  alter column access_token drop not null,
  alter column refresh_token drop not null;
