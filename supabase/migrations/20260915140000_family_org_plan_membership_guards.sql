-- Family Premium: enforce active plan for invites, block conflicting joins,
-- revoke cleanly on remove. Org: restore partner caps in entitlements JSON;
-- re-check DM eligibility when posting to existing direct threads.

-- ========== Family: require active Family Premium to invite ==========
create or replace function public.household_has_active_family_premium(p_household_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.household_id = p_household_id
      and s.plan_type = 'family'
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke all on function public.household_has_active_family_premium(text) from public;
grant execute on function public.household_has_active_family_premium(text) to authenticated;

create or replace function public.create_family_connection_request(
  p_household_id text,
  p_to_user_id uuid default null,
  p_to_email text default null,
  p_to_phone text default null,
  p_invite_token text default null,
  p_relationship text default 'spouse'
)
returns public.family_connection_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.family_connection_requests;
  new_id text := gen_random_uuid()::text;
  seats_used integer;
  v_relationship text := lower(trim(coalesce(p_relationship, '')));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if v_relationship not in ('spouse', 'family_1', 'family_2') then
    raise exception 'Choose a relationship: spouse, family_1, or family_2';
  end if;

  if not exists (
    select 1
    from public.family_households h
    where h.id = p_household_id
      and h.created_by_user_id = auth.uid()
  ) then
    raise exception 'Only the Family Premium owner can invite members';
  end if;

  if not public.household_has_active_family_premium(p_household_id) then
    raise exception 'Family Premium is required to invite members';
  end if;

  if p_to_user_id is not null and p_to_user_id = auth.uid() then
    raise exception 'Cannot connect to yourself';
  end if;

  if p_to_user_id is not null and exists (
    select 1
    from public.family_members m
    where m.household_id = p_household_id
      and m.linked_user_id = p_to_user_id
      and m.kind in ('self', 'spouse')
  ) then
    raise exception 'That person is already in this household';
  end if;

  if p_to_user_id is not null and exists (
    select 1
    from public.family_members m
    where m.linked_user_id = p_to_user_id
      and m.kind = 'spouse'
      and m.household_id is distinct from p_household_id
  ) then
    raise exception 'That person is already on another Family plan';
  end if;

  if p_to_user_id is not null and exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_to_user_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) then
    raise exception 'That person already has an active Premium subscription';
  end if;

  if p_to_user_id is not null and exists (
    select 1
    from public.family_connection_requests r
    where r.household_id = p_household_id
      and r.to_user_id = p_to_user_id
      and r.status = 'pending'
  ) then
    raise exception 'A pending invite already exists for that person';
  end if;

  if exists (
    select 1
    from public.family_members m
    where m.household_id = p_household_id
      and m.kind = 'spouse'
      and m.relationship = v_relationship
  ) or exists (
    select 1
    from public.family_connection_requests r
    where r.household_id = p_household_id
      and r.status = 'pending'
      and r.relationship = v_relationship
  ) then
    raise exception 'That relationship is already used in this household';
  end if;

  seats_used := public.family_adult_invite_seats_used(p_household_id);
  if seats_used >= 3 then
    raise exception 'Family Premium allows up to 3 invited members';
  end if;

  insert into public.family_connection_requests (
    id, household_id, from_user_id, to_user_id, to_email, to_phone, status, invite_token, relationship
  ) values (
    new_id,
    p_household_id,
    auth.uid(),
    p_to_user_id,
    nullif(lower(trim(coalesce(p_to_email, ''))), ''),
    nullif(trim(coalesce(p_to_phone, '')), ''),
    'pending',
    p_invite_token,
    v_relationship
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.respond_family_connection_request(
  p_request_id text,
  p_accept boolean,
  p_self_full_name text default 'Family member'
)
returns public.family_connection_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.family_connection_requests;
  result public.family_connection_requests;
  seats_used integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into req
  from public.family_connection_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'Request not found';
  end if;

  if req.to_user_id is distinct from auth.uid() then
    raise exception 'Not the recipient of this request';
  end if;

  if req.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  if not p_accept then
    update public.family_connection_requests
    set status = 'declined', updated_at = now()
    where id = p_request_id
    returning * into result;
    return result;
  end if;

  if not public.household_has_active_family_premium(req.household_id) then
    raise exception 'This Family Premium plan is no longer active';
  end if;

  if exists (
    select 1
    from public.family_members m
    where m.linked_user_id = auth.uid()
      and m.kind = 'spouse'
      and m.household_id is distinct from req.household_id
  ) then
    raise exception 'You are already on another Family plan';
  end if;

  if exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) then
    raise exception 'Cancel or wait out your Premium subscription before joining a Family plan';
  end if;

  if not exists (
    select 1 from public.family_members
    where household_id = req.household_id
      and linked_user_id = auth.uid()
      and kind in ('self', 'spouse')
  ) then
    seats_used := (
      select count(*)::integer
      from public.family_members m
      where m.household_id = req.household_id
        and m.kind = 'spouse'
    );
    if seats_used >= 3 then
      raise exception 'Family Premium allows up to 3 invited members';
    end if;

    insert into public.family_members (
      id, household_id, kind, linked_user_id, full_name, relationship
    ) values (
      gen_random_uuid()::text,
      req.household_id,
      'spouse',
      auth.uid(),
      coalesce(nullif(trim(p_self_full_name), ''), 'Family member'),
      req.relationship
    );
  end if;

  update public.family_connection_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id
  returning * into result;

  return result;
end;
$$;

-- ========== Org entitlements: restore partner connection caps ==========
create or replace function public.provider_org_entitlements(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub public.provider_org_subscriptions;
begin
  if p_org_id is null then
    return public.provider_org_free_entitlements();
  end if;

  perform public.assert_can_read_provider_org_entitlements(p_org_id);

  select * into v_sub
  from public.provider_org_subscriptions s
  where s.organization_id = p_org_id
    and s.status in ('active', 'trialing')
    and (s.current_period_end is null or s.current_period_end > now())
  order by
    case s.plan_tier
      when 'enterprise' then 3
      when 'pro' then 2
      when 'basic' then 1
      else 0
    end desc,
    s.created_at desc
  limit 1;

  if not found then
    return public.provider_org_free_entitlements();
  end if;

  return jsonb_build_object(
    'plan_tier', v_sub.plan_tier,
    'billing_interval', v_sub.billing_interval,
    'pct_seat_limit', v_sub.pct_seat_limit,
    'patient_connection_cap', v_sub.patient_connection_cap,
    'payer_connection_cap', coalesce(v_sub.payer_connection_cap, 3),
    'voice_minutes_included', v_sub.voice_minutes_included,
    'video_minutes_included', v_sub.video_minutes_included,
    'status', v_sub.status,
    'subscription_id', v_sub.id,
    'current_period_end', v_sub.current_period_end
  );
end;
$$;

create or replace function public.payer_org_entitlements(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub public.payer_org_subscriptions;
begin
  if p_org_id is null then
    return public.payer_org_free_entitlements();
  end if;

  perform public.assert_can_read_payer_org_entitlements(p_org_id);

  select * into v_sub
  from public.payer_org_subscriptions s
  where s.organization_id = p_org_id
    and s.status in ('active', 'trialing')
    and (s.current_period_end is null or s.current_period_end > now())
  order by
    case s.plan_tier
      when 'enterprise' then 3
      when 'pro' then 2
      when 'basic' then 1
      else 0
    end desc,
    s.created_at desc
  limit 1;

  if not found then
    return public.payer_org_free_entitlements();
  end if;

  return jsonb_build_object(
    'plan_tier', v_sub.plan_tier,
    'billing_interval', v_sub.billing_interval,
    'support_team_seat_limit', v_sub.support_team_seat_limit,
    'patient_connection_cap', v_sub.patient_connection_cap,
    'provider_connection_cap', coalesce(v_sub.provider_connection_cap, 3),
    'voice_minutes_included', v_sub.voice_minutes_included,
    'group_chat_enabled', v_sub.group_chat_enabled,
    'status', v_sub.status,
    'subscription_id', v_sub.id,
    'current_period_end', v_sub.current_period_end
  );
end;
$$;

-- ========== Direct DMs: re-check seat eligibility on every send ==========
create or replace function public.post_patient_message(
  p_conversation_id uuid,
  p_body text
)
returns public.message_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_row public.message_messages;
  v_conv public.message_conversations;
  v_now timestamptz := now();
  v_other uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if v_body = '' then
    raise exception 'Message body is required';
  end if;

  select * into v_conv
  from public.message_conversations c
  where c.id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.kind = 'org_patient' then
    if v_conv.patient_user_id is distinct from auth.uid() then
      raise exception 'Conversation not found';
    end if;
    if v_conv.organization_id is not null then
      if not public.has_org_messaging_consent(v_conv.organization_id, auth.uid()) then
        raise exception 'Messaging consent required';
      end if;
    elsif v_conv.payer_organization_id is not null then
      if not exists (
        select 1
        from public.patient_payer_connections c
        where c.payer_organization_id = v_conv.payer_organization_id
          and c.patient_id = auth.uid()
          and c.status = 'approved'
      ) then
        raise exception 'Not connected to this payer';
      end if;
    else
      raise exception 'Invalid conversation';
    end if;
  elsif v_conv.kind = 'direct' then
    if not public.is_message_conversation_participant(p_conversation_id, auth.uid()) then
      raise exception 'Conversation not found';
    end if;

    select p.user_id into v_other
    from public.message_participants p
    where p.conversation_id = p_conversation_id
      and p.party_type = 'user'
      and p.user_id is distinct from auth.uid()
    limit 1;

    if v_other is null then
      raise exception 'Conversation not found';
    end if;

    if v_conv.organization_id is not null then
      if not public.can_direct_message(v_conv.organization_id, auth.uid(), v_other) then
        raise exception 'You no longer have access to message this person';
      end if;
    elsif v_conv.payer_organization_id is not null then
      if not public.can_payer_direct_message(v_conv.payer_organization_id, auth.uid(), v_other) then
        raise exception 'You no longer have access to message this person';
      end if;
    else
      raise exception 'Invalid conversation';
    end if;
  elsif v_conv.kind = 'care_coordination' then
    if v_conv.patient_user_id = auth.uid() then
      if not public.has_org_messaging_consent(v_conv.organization_id, auth.uid()) then
        raise exception 'Messaging consent required';
      end if;
    elsif not public.is_care_coordination_staff(p_conversation_id, auth.uid()) then
      raise exception 'Conversation not found';
    end if;
  else
    raise exception 'Unsupported conversation';
  end if;

  insert into public.message_messages (
    conversation_id,
    sender_party_type,
    sender_user_id,
    body,
    created_at
  )
  values (
    p_conversation_id,
    'user',
    auth.uid(),
    v_body,
    v_now
  )
  returning * into v_row;

  update public.message_conversations
  set
    last_message_at = v_now,
    last_message_preview = left(v_body, 160),
    updated_at = v_now
  where id = p_conversation_id;

  update public.message_participants
  set last_read_at = v_now
  where conversation_id = p_conversation_id
    and party_type = 'user'
    and user_id = auth.uid();

  return v_row;
end;
$$;
