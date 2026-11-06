-- Align CareMate AI daily quota default with HDG Phase 1 cap (5 messages / 24h).
-- HDG always passes p_daily_limit explicitly; this updates the SQL default for safety.

create or replace function public.ai_consume_rate_limit(
  p_user_id uuid,
  p_client_request_id uuid default null,
  p_daily_limit integer default 5,
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

comment on function public.ai_consume_rate_limit(uuid, uuid, integer, integer, integer) is
  'Atomically reserve a CareMate AI rate-limit slot for a user (HDG service_role only). Default daily cap is 5.';
