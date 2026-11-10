-- Exclusive processing claim/lease for CareMate AI user turns.
-- Only the request that claims a pending/failed user message may call the model.
-- Concurrent retries with the same client_request_id wait or get a busy response.

alter table public.ai_message
  add column if not exists processing_claimed_at timestamptz;

comment on column public.ai_message.processing_claimed_at is
  'Exclusive lease timestamp for in-flight model work on a user turn. Null when idle.';

create or replace function public.ai_try_claim_user_message(
  p_message_id uuid,
  p_lease_seconds integer default 45
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_message%rowtype;
  v_lease_seconds integer := greatest(coalesce(p_lease_seconds, 45), 5);
begin
  if p_message_id is null then
    return jsonb_build_object('claimed', false, 'reason', 'invalid_message');
  end if;

  update public.ai_message
  set
    processing_claimed_at = now(),
    status = case when status = 'failed' then 'pending' else status end
  where id = p_message_id
    and role = 'user'
    and status in ('pending', 'failed')
    and (
      processing_claimed_at is null
      or processing_claimed_at < now() - make_interval(secs => v_lease_seconds)
    )
  returning * into v_row;

  if found then
    return jsonb_build_object(
      'claimed', true,
      'reason', null,
      'message_id', v_row.id,
      'status', v_row.status,
      'processing_claimed_at', v_row.processing_claimed_at
    );
  end if;

  select * into v_row
  from public.ai_message
  where id = p_message_id
    and role = 'user';

  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'not_found');
  end if;

  if v_row.status in ('complete', 'refused') then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'finished',
      'message_id', v_row.id,
      'status', v_row.status
    );
  end if;

  return jsonb_build_object(
    'claimed', false,
    'reason', 'busy',
    'message_id', v_row.id,
    'status', v_row.status,
    'processing_claimed_at', v_row.processing_claimed_at
  );
end;
$$;

revoke all on function public.ai_try_claim_user_message(uuid, integer) from public;
revoke all on function public.ai_try_claim_user_message(uuid, integer) from anon;
revoke all on function public.ai_try_claim_user_message(uuid, integer) from authenticated;
grant execute on function public.ai_try_claim_user_message(uuid, integer) to service_role;

comment on function public.ai_try_claim_user_message(uuid, integer) is
  'Atomically claim a CareMate AI user turn for model processing (HDG service_role only).';
