-- Care team messaging: admin-first roster, PCT + is_health_practitioner for provider DMs,
-- payer Support Team DMs, and payer-scoped direct conversation pairs.

-- ========== Provider helpers ==========

create or replace function public.is_provider_org_admin_member(
  p_org_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_org_members m
    where m.organization_id = p_org_id
      and m.user_id = p_user_id
      and m.deleted_at is null
      and m.role in ('owner', 'administrator')
  );
$$;

comment on function public.is_provider_org_admin_member(uuid, uuid) is
  'True when the user is an active owner or administrator of the provider org.';

grant execute on function public.is_provider_org_admin_member(uuid, uuid) to authenticated;

create or replace function public.is_private_care_team_practitioner(
  p_org_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_org_members m
    join public.profiles p on p.user_id = m.user_id
    where m.organization_id = p_org_id
      and m.user_id = p_user_id
      and m.deleted_at is null
      and m.private_care_team = true
      and m.role in ('owner', 'administrator', 'staff')
      and coalesce(p.is_health_practitioner, false) = true
  );
$$;

comment on function public.is_private_care_team_practitioner(uuid, uuid) is
  'Private Care Team member who is marked is_health_practitioner on their profile.';

grant execute on function public.is_private_care_team_practitioner(uuid, uuid) to authenticated;

-- Patient DMs: org admin always (with consent), or PCT health practitioner (with consent).
create or replace function public.can_direct_message(
  p_org_id uuid,
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and p_user_a <> p_user_b
    and p_org_id is not null
    and public.is_linked_to_org(p_org_id, p_user_a)
    and public.is_linked_to_org(p_org_id, p_user_b)
    and (
      (
        public.is_org_practitioner(p_org_id, p_user_a)
        and public.is_org_practitioner(p_org_id, p_user_b)
      )
      or (
        public.is_provider_org_admin_member(p_org_id, p_user_a)
        and public.has_org_messaging_consent(p_org_id, p_user_b)
      )
      or (
        public.is_provider_org_admin_member(p_org_id, p_user_b)
        and public.has_org_messaging_consent(p_org_id, p_user_a)
      )
      or (
        public.is_private_care_team_practitioner(p_org_id, p_user_a)
        and public.has_org_messaging_consent(p_org_id, p_user_b)
      )
      or (
        public.is_private_care_team_practitioner(p_org_id, p_user_b)
        and public.has_org_messaging_consent(p_org_id, p_user_a)
      )
    );
$$;

-- ========== Payer helpers ==========

create or replace function public.is_payer_org_member_user(
  p_org_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payer_org_members m
    where m.organization_id = p_org_id
      and m.user_id = p_user_id
      and m.deleted_at is null
  );
$$;

grant execute on function public.is_payer_org_member_user(uuid, uuid) to authenticated;

create or replace function public.is_payer_org_admin_member(
  p_org_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payer_org_members m
    where m.organization_id = p_org_id
      and m.user_id = p_user_id
      and m.deleted_at is null
      and m.role in ('owner', 'administrator')
  );
$$;

grant execute on function public.is_payer_org_admin_member(uuid, uuid) to authenticated;

create or replace function public.is_linked_to_payer_org(
  p_org_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_payer_org_member_user(p_org_id, p_user_id)
    or exists (
      select 1
      from public.patient_payer_connections c
      where c.payer_organization_id = p_org_id
        and c.patient_id = p_user_id
        and c.status = 'approved'
    );
$$;

grant execute on function public.is_linked_to_payer_org(uuid, uuid) to authenticated;

create or replace function public.has_payer_patient_connection(
  p_org_id uuid,
  p_patient_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_payer_connections c
    where c.payer_organization_id = p_org_id
      and c.patient_id = p_patient_id
      and c.status = 'approved'
  );
$$;

grant execute on function public.has_payer_patient_connection(uuid, uuid) to authenticated;

create or replace function public.can_payer_direct_message(
  p_org_id uuid,
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and p_user_a <> p_user_b
    and p_org_id is not null
    and public.is_linked_to_payer_org(p_org_id, p_user_a)
    and public.is_linked_to_payer_org(p_org_id, p_user_b)
    and (
      (
        public.is_payer_org_member_user(p_org_id, p_user_a)
        and public.is_payer_org_member_user(p_org_id, p_user_b)
      )
      or (
        public.is_payer_org_admin_member(p_org_id, p_user_a)
        and public.has_payer_patient_connection(p_org_id, p_user_b)
      )
      or (
        public.is_payer_org_admin_member(p_org_id, p_user_b)
        and public.has_payer_patient_connection(p_org_id, p_user_a)
      )
      or (
        public.is_support_team_member(p_org_id, p_user_a)
        and public.has_payer_patient_connection(p_org_id, p_user_b)
      )
      or (
        public.is_support_team_member(p_org_id, p_user_b)
        and public.has_payer_patient_connection(p_org_id, p_user_a)
      )
    );
$$;

comment on function public.can_payer_direct_message(uuid, uuid, uuid) is
  'Payer org DMs: staff↔staff, or connected patient↔admin/support team member.';

grant execute on function public.can_payer_direct_message(uuid, uuid, uuid) to authenticated;

-- ========== Direct conversation shape (provider or payer org scope) ==========

alter table public.message_conversations
  drop constraint if exists message_conversations_kind_shape;

alter table public.message_conversations
  add constraint message_conversations_kind_shape check (
    (
      kind = 'org_patient'
      and patient_user_id is not null
      and (
        (organization_id is not null and payer_organization_id is null)
        or (payer_organization_id is not null and organization_id is null)
      )
    )
    or (
      kind = 'direct'
      and patient_user_id is null
      and (
        (organization_id is not null and payer_organization_id is null)
        or (payer_organization_id is not null and organization_id is null)
      )
    )
    or (
      kind = 'care_coordination'
      and patient_user_id is not null
      and organization_id is not null
      and payer_organization_id is not null
    )
  );

alter table public.message_direct_pairs
  alter column organization_id drop not null;

alter table public.message_direct_pairs
  add column if not exists payer_organization_id uuid
    references public.payer_organizations (id) on delete cascade;

alter table public.message_direct_pairs
  drop constraint if exists message_direct_pairs_org_scope;

alter table public.message_direct_pairs
  add constraint message_direct_pairs_org_scope check (
    (
      organization_id is not null
      and payer_organization_id is null
    )
    or (
      organization_id is null
      and payer_organization_id is not null
    )
  );

alter table public.message_direct_pairs
  drop constraint if exists message_direct_pairs_organization_id_user_low_user_high_key;

drop index if exists message_direct_pairs_provider_pair_uidx;
create unique index message_direct_pairs_provider_pair_uidx
  on public.message_direct_pairs (organization_id, user_low, user_high)
  where organization_id is not null;

drop index if exists message_direct_pairs_payer_pair_uidx;
create unique index message_direct_pairs_payer_pair_uidx
  on public.message_direct_pairs (payer_organization_id, user_low, user_high)
  where payer_organization_id is not null;

create index if not exists message_direct_pairs_payer_user_low_idx
  on public.message_direct_pairs (user_low)
  where payer_organization_id is not null;

create index if not exists message_direct_pairs_payer_user_high_idx
  on public.message_direct_pairs (user_high)
  where payer_organization_id is not null;

-- ========== Start / continue direct thread (provider or payer) ==========

create or replace function public.start_direct_conversation(
  p_other_user_id uuid,
  p_organization_id uuid,
  p_body text default null,
  p_org_kind text default 'provider'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_low uuid;
  v_high uuid;
  v_conv_id uuid;
  v_now timestamptz := now();
  v_message public.message_messages;
  v_created boolean := false;
  v_kind text := lower(trim(coalesce(p_org_kind, 'provider')));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_other_user_id is null or p_organization_id is null then
    raise exception 'Recipient and organization are required';
  end if;

  if v_kind not in ('provider', 'payer') then
    raise exception 'Invalid org kind';
  end if;

  if v_kind = 'provider' then
    if not public.can_direct_message(p_organization_id, v_uid, p_other_user_id) then
      raise exception 'You cannot message this person';
    end if;

    if p_other_user_id < v_uid then
      v_low := p_other_user_id;
      v_high := v_uid;
    else
      v_low := v_uid;
      v_high := p_other_user_id;
    end if;

    select conversation_id into v_conv_id
    from public.message_direct_pairs
    where organization_id = p_organization_id
      and user_low = v_low
      and user_high = v_high;

    if v_conv_id is null then
      begin
        insert into public.message_conversations (
          kind,
          organization_id,
          payer_organization_id,
          patient_user_id,
          last_message_at,
          last_message_preview,
          created_at,
          updated_at
        )
        values (
          'direct',
          p_organization_id,
          null,
          null,
          case when v_body is not null then v_now else null end,
          case when v_body is not null then left(v_body, 160) else null end,
          v_now,
          v_now
        )
        returning id into v_conv_id;

        insert into public.message_direct_pairs (
          conversation_id,
          organization_id,
          payer_organization_id,
          user_low,
          user_high
        )
        values (v_conv_id, p_organization_id, null, v_low, v_high);

        insert into public.message_participants (conversation_id, party_type, user_id)
        values
          (v_conv_id, 'user', v_uid),
          (v_conv_id, 'user', p_other_user_id);

        v_created := true;
      exception
        when unique_violation then
          delete from public.message_conversations where id = v_conv_id;
          select conversation_id into v_conv_id
          from public.message_direct_pairs
          where organization_id = p_organization_id
            and user_low = v_low
            and user_high = v_high;
          v_created := false;
      end;
    end if;
  else
    if not public.can_payer_direct_message(p_organization_id, v_uid, p_other_user_id) then
      raise exception 'You cannot message this person';
    end if;

    if p_other_user_id < v_uid then
      v_low := p_other_user_id;
      v_high := v_uid;
    else
      v_low := v_uid;
      v_high := p_other_user_id;
    end if;

    select conversation_id into v_conv_id
    from public.message_direct_pairs
    where payer_organization_id = p_organization_id
      and user_low = v_low
      and user_high = v_high;

    if v_conv_id is null then
      begin
        insert into public.message_conversations (
          kind,
          organization_id,
          payer_organization_id,
          patient_user_id,
          last_message_at,
          last_message_preview,
          created_at,
          updated_at
        )
        values (
          'direct',
          null,
          p_organization_id,
          null,
          case when v_body is not null then v_now else null end,
          case when v_body is not null then left(v_body, 160) else null end,
          v_now,
          v_now
        )
        returning id into v_conv_id;

        insert into public.message_direct_pairs (
          conversation_id,
          organization_id,
          payer_organization_id,
          user_low,
          user_high
        )
        values (v_conv_id, null, p_organization_id, v_low, v_high);

        insert into public.message_participants (conversation_id, party_type, user_id)
        values
          (v_conv_id, 'user', v_uid),
          (v_conv_id, 'user', p_other_user_id);

        v_created := true;
      exception
        when unique_violation then
          delete from public.message_conversations where id = v_conv_id;
          select conversation_id into v_conv_id
          from public.message_direct_pairs
          where payer_organization_id = p_organization_id
            and user_low = v_low
            and user_high = v_high;
          v_created := false;
      end;
    end if;
  end if;

  if v_conv_id is null then
    raise exception 'Could not open conversation';
  end if;

  insert into public.message_participants (conversation_id, party_type, user_id)
  select v_conv_id, 'user', v_uid
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = v_conv_id and p.party_type = 'user' and p.user_id = v_uid
  );

  insert into public.message_participants (conversation_id, party_type, user_id)
  select v_conv_id, 'user', p_other_user_id
  where not exists (
    select 1 from public.message_participants p
    where p.conversation_id = v_conv_id
      and p.party_type = 'user'
      and p.user_id = p_other_user_id
  );

  if v_body is not null then
    insert into public.message_messages (
      conversation_id,
      sender_party_type,
      sender_user_id,
      body,
      created_at
    )
    values (
      v_conv_id,
      'user',
      v_uid,
      v_body,
      v_now
    )
    returning * into v_message;

    update public.message_conversations
    set
      last_message_at = v_now,
      last_message_preview = left(v_body, 160),
      updated_at = v_now
    where id = v_conv_id;

    update public.message_participants
    set last_read_at = v_now
    where conversation_id = v_conv_id
      and party_type = 'user'
      and user_id = v_uid;
  end if;

  return jsonb_build_object(
    'conversation_id', v_conv_id,
    'created', v_created,
    'message', case when v_message.id is null then null else to_jsonb(v_message) end
  );
end;
$$;

revoke all on function public.start_direct_conversation(uuid, uuid, text, text) from public;
grant execute on function public.start_direct_conversation(uuid, uuid, text, text) to authenticated;

-- ========== Connected org care team (admin first, accurate can_message) ==========

create or replace function public.list_connected_org_care_team(
  p_org_kind text,
  p_org_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  position text,
  can_message boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text := lower(trim(coalesce(p_org_kind, '')));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_kind not in ('provider', 'payer') then
    raise exception 'Invalid org kind';
  end if;

  if v_kind = 'provider' then
    if not exists (
      select 1
      from public.patient_provider_connections c
      where c.organization_id = p_org_id
        and c.patient_id = v_uid
        and c.status = 'approved'
    ) then
      raise exception 'Not connected to this provider';
    end if;

    return query
    select
      m.user_id,
      coalesce(
        nullif(trim(m.display_name), ''),
        nullif(trim(p.full_name), ''),
        'Care team member'
      ) as display_name,
      nullif(trim(m.position), '') as position,
      public.can_direct_message(p_org_id, v_uid, m.user_id) as can_message
    from public.provider_org_members m
    left join public.profiles p on p.user_id = m.user_id
    where m.organization_id = p_org_id
      and m.deleted_at is null
      and m.role in ('owner', 'administrator', 'staff')
      and (
        m.role in ('owner', 'administrator')
        or (
          m.private_care_team = true
          and coalesce(p.is_health_practitioner, false) = true
        )
      )
    order by
      case m.role
        when 'owner' then 0
        when 'administrator' then 1
        else 2
      end,
      2 asc nulls last;

    return;
  end if;

  if not exists (
    select 1
    from public.patient_payer_connections c
    where c.payer_organization_id = p_org_id
      and c.patient_id = v_uid
      and c.status = 'approved'
  ) then
    raise exception 'Not connected to this insurer';
  end if;

  return query
  select
    m.user_id,
    coalesce(
      nullif(trim(m.display_name), ''),
      nullif(trim(p.full_name), ''),
      'Support team member'
    ) as display_name,
    nullif(trim(m.position), '') as position,
    public.can_payer_direct_message(p_org_id, v_uid, m.user_id) as can_message
  from public.payer_org_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.organization_id = p_org_id
    and m.deleted_at is null
    and m.role in ('owner', 'administrator', 'staff')
    and (
      m.role in ('owner', 'administrator')
      or m.support_team = true
    )
  order by
    case m.role
      when 'owner' then 0
      when 'administrator' then 1
      else 2
    end,
    2 asc nulls last;
end;
$$;

comment on function public.list_connected_org_care_team(text, uuid) is
  'Care/Support team for connected patients: org admin first, then PCT practitioners (provider) or support team (payer).';

revoke all on function public.list_connected_org_care_team(text, uuid) from public;
grant execute on function public.list_connected_org_care_team(text, uuid) to authenticated;
