-- CareMate AI turn lifecycle: transactional complete/fail + stale pending recovery.
-- Complements processing claims (20261106180000): post-claim failures must not leave
-- user turns stuck in pending forever.

create or replace function public.ai_fail_user_turn(p_user_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_message%rowtype;
begin
  if p_user_message_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_message');
  end if;

  update public.ai_message
  set
    status = 'failed',
    processing_claimed_at = null
  where id = p_user_message_id
    and role = 'user'
    and status = 'pending'
  returning * into v_row;

  if found then
    return jsonb_build_object(
      'ok', true,
      'reason', 'failed',
      'message_id', v_row.id,
      'status', v_row.status
    );
  end if;

  select * into v_row
  from public.ai_message
  where id = p_user_message_id
    and role = 'user';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'reason', 'unchanged',
    'message_id', v_row.id,
    'status', v_row.status
  );
end;
$$;

revoke all on function public.ai_fail_user_turn(uuid) from public;
revoke all on function public.ai_fail_user_turn(uuid) from anon;
revoke all on function public.ai_fail_user_turn(uuid) from authenticated;
grant execute on function public.ai_fail_user_turn(uuid) to service_role;

comment on function public.ai_fail_user_turn(uuid) is
  'Mark a pending CareMate AI user turn failed and clear its processing lease (HDG only).';

create or replace function public.ai_complete_user_turn(
  p_user_message_id uuid,
  p_conversation_id uuid,
  p_content text,
  p_status text,
  p_model text default null,
  p_prompt_tokens integer default null,
  p_completion_tokens integer default null,
  p_safety_state text default 'ok',
  p_phi_encrypted_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.ai_message%rowtype;
  v_assistant public.ai_message%rowtype;
begin
  if p_user_message_id is null or p_conversation_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_args');
  end if;

  if p_status is null or p_status not in ('complete', 'refused') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_assistant_status');
  end if;

  select * into v_user
  from public.ai_message
  where id = p_user_message_id
    and role = 'user'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  if v_user.conversation_id is distinct from p_conversation_id then
    return jsonb_build_object('ok', false, 'reason', 'conversation_mismatch');
  end if;

  select * into v_assistant
  from public.ai_message
  where parent_message_id = p_user_message_id
    and role = 'assistant'
  for update;

  if found and v_assistant.status is distinct from 'failed' then
    -- Already finished — heal user row if needed, do not overwrite assistant.
    if v_user.status is distinct from 'complete' then
      update public.ai_message
      set
        status = 'complete',
        processing_claimed_at = null
      where id = p_user_message_id
      returning * into v_user;
    end if;

    return jsonb_build_object(
      'ok', true,
      'reason', 'already_complete',
      'user_message', to_jsonb(v_user),
      'assistant_message', to_jsonb(v_assistant)
    );
  end if;

  if found then
    update public.ai_message
    set
      content = p_content,
      status = p_status,
      model = p_model,
      prompt_tokens = p_prompt_tokens,
      completion_tokens = p_completion_tokens,
      safety_state = coalesce(p_safety_state, 'ok'),
      phi_encrypted_at = p_phi_encrypted_at
    where id = v_assistant.id
    returning * into v_assistant;
  else
    insert into public.ai_message (
      conversation_id,
      role,
      content,
      status,
      model,
      prompt_tokens,
      completion_tokens,
      safety_state,
      parent_message_id,
      phi_encrypted_at
    ) values (
      p_conversation_id,
      'assistant',
      p_content,
      p_status,
      p_model,
      p_prompt_tokens,
      p_completion_tokens,
      coalesce(p_safety_state, 'ok'),
      p_user_message_id,
      p_phi_encrypted_at
    )
    returning * into v_assistant;
  end if;

  update public.ai_message
  set
    status = 'complete',
    processing_claimed_at = null
  where id = p_user_message_id
  returning * into v_user;

  return jsonb_build_object(
    'ok', true,
    'reason', 'completed',
    'user_message', to_jsonb(v_user),
    'assistant_message', to_jsonb(v_assistant)
  );
exception
  when unique_violation then
    select * into v_assistant
    from public.ai_message
    where parent_message_id = p_user_message_id
      and role = 'assistant';

    update public.ai_message
    set
      status = 'complete',
      processing_claimed_at = null
    where id = p_user_message_id
      and role = 'user'
    returning * into v_user;

    return jsonb_build_object(
      'ok', true,
      'reason', 'race_complete',
      'user_message', to_jsonb(v_user),
      'assistant_message', to_jsonb(v_assistant)
    );
end;
$$;

revoke all on function public.ai_complete_user_turn(uuid, uuid, text, text, text, integer, integer, text, timestamptz) from public;
revoke all on function public.ai_complete_user_turn(uuid, uuid, text, text, text, integer, integer, text, timestamptz) from anon;
revoke all on function public.ai_complete_user_turn(uuid, uuid, text, text, text, integer, integer, text, timestamptz) from authenticated;
grant execute on function public.ai_complete_user_turn(uuid, uuid, text, text, text, integer, integer, text, timestamptz) to service_role;

comment on function public.ai_complete_user_turn(uuid, uuid, text, text, text, integer, integer, text, timestamptz) is
  'Atomically persist assistant reply and mark the user turn complete (HDG only).';

create or replace function public.ai_recover_stale_pending_turns(
  p_conversation_id uuid default null,
  p_stale_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale_seconds integer := greatest(coalesce(p_stale_seconds, 120), 30);
  v_healed integer := 0;
  v_failed integer := 0;
begin
  -- Heal: assistant finished but user row still pending.
  with healed as (
    update public.ai_message u
    set
      status = 'complete',
      processing_claimed_at = null
    where u.role = 'user'
      and u.status = 'pending'
      and (p_conversation_id is null or u.conversation_id = p_conversation_id)
      and exists (
        select 1
        from public.ai_message a
        where a.parent_message_id = u.id
          and a.role = 'assistant'
          and a.status is distinct from 'failed'
      )
    returning u.id
  )
  select count(*)::integer into v_healed from healed;

  -- Fail: pending too long with no usable assistant (abandoned / crashed workers).
  with failed as (
    update public.ai_message u
    set
      status = 'failed',
      processing_claimed_at = null
    where u.role = 'user'
      and u.status = 'pending'
      and (p_conversation_id is null or u.conversation_id = p_conversation_id)
      and coalesce(u.processing_claimed_at, u.created_at)
        < now() - make_interval(secs => v_stale_seconds)
      and not exists (
        select 1
        from public.ai_message a
        where a.parent_message_id = u.id
          and a.role = 'assistant'
          and a.status is distinct from 'failed'
      )
    returning u.id
  )
  select count(*)::integer into v_failed from failed;

  return jsonb_build_object(
    'ok', true,
    'healed', v_healed,
    'failed', v_failed,
    'stale_seconds', v_stale_seconds
  );
end;
$$;

revoke all on function public.ai_recover_stale_pending_turns(uuid, integer) from public;
revoke all on function public.ai_recover_stale_pending_turns(uuid, integer) from anon;
revoke all on function public.ai_recover_stale_pending_turns(uuid, integer) from authenticated;
grant execute on function public.ai_recover_stale_pending_turns(uuid, integer) to service_role;

comment on function public.ai_recover_stale_pending_turns(uuid, integer) is
  'Heal or fail CareMate AI user turns stuck in pending (HDG only).';
