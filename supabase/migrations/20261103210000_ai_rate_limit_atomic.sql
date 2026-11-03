-- Atomic CareMate AI rate limiting (per-user advisory lock + reservation row).
-- Quota unit is a reservation (one per client_request_id when provided).
-- Failed model calls do not free the reservation; retries with the same
-- client_request_id reuse it and do not double-consume.

create table if not exists public.ai_rate_reservation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_request_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_rate_reservation_user_client_uidx
  on public.ai_rate_reservation (user_id, client_request_id)
  where client_request_id is not null;

create index if not exists ai_rate_reservation_user_created_idx
  on public.ai_rate_reservation (user_id, created_at desc);

alter table public.ai_rate_reservation enable row level security;

revoke all on public.ai_rate_reservation from authenticated;
revoke all on public.ai_rate_reservation from anon;

comment on table public.ai_rate_reservation is
  'HDG-only CareMate AI rate-limit reservations. Written only via ai_consume_rate_limit.';

create or replace function public.ai_consume_rate_limit(
  p_user_id uuid,
  p_client_request_id uuid default null,
  p_daily_limit integer default 30,
  p_burst_limit integer default 5,
  p_burst_window_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_day_count integer;
  v_burst_count integer;
  v_id uuid;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_user',
      'day_count', 0,
      'burst_count', 0
    );
  end if;

  -- Serialize concurrent consumes for this user (released at end of transaction).
  perform pg_advisory_xact_lock(hashtext('caremate-ai-rate:' || p_user_id::text));

  if p_client_request_id is not null then
    select id into v_existing
    from public.ai_rate_reservation
    where user_id = p_user_id
      and client_request_id = p_client_request_id;

    if v_existing is not null then
      return jsonb_build_object(
        'allowed', true,
        'reason', null,
        'idempotent', true,
        'reservation_id', v_existing,
        'day_count', null,
        'burst_count', null
      );
    end if;
  end if;

  select count(*)::integer into v_day_count
  from public.ai_rate_reservation
  where user_id = p_user_id
    and created_at >= now() - interval '24 hours';

  if v_day_count >= p_daily_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily',
      'idempotent', false,
      'day_count', v_day_count,
      'burst_count', null
    );
  end if;

  select count(*)::integer into v_burst_count
  from public.ai_rate_reservation
  where user_id = p_user_id
    and created_at >= now() - make_interval(secs => p_burst_window_seconds);

  if v_burst_count >= p_burst_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'burst',
      'idempotent', false,
      'day_count', v_day_count,
      'burst_count', v_burst_count
    );
  end if;

  insert into public.ai_rate_reservation (user_id, client_request_id)
  values (p_user_id, p_client_request_id)
  returning id into v_id;

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'idempotent', false,
    'reservation_id', v_id,
    'day_count', v_day_count + 1,
    'burst_count', v_burst_count + 1
  );
exception
  when unique_violation then
    -- Concurrent insert with same client_request_id — treat as idempotent allow.
    select id into v_existing
    from public.ai_rate_reservation
    where user_id = p_user_id
      and client_request_id = p_client_request_id;

    return jsonb_build_object(
      'allowed', true,
      'reason', null,
      'idempotent', true,
      'reservation_id', v_existing,
      'day_count', null,
      'burst_count', null
    );
end;
$$;

revoke all on function public.ai_consume_rate_limit(uuid, uuid, integer, integer, integer) from public;
revoke all on function public.ai_consume_rate_limit(uuid, uuid, integer, integer, integer) from anon;
revoke all on function public.ai_consume_rate_limit(uuid, uuid, integer, integer, integer) from authenticated;
grant execute on function public.ai_consume_rate_limit(uuid, uuid, integer, integer, integer) to service_role;

comment on function public.ai_consume_rate_limit(uuid, uuid, integer, integer, integer) is
  'Atomically reserve a CareMate AI rate-limit slot for a user (HDG service_role only).';
