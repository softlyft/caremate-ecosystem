-- Fix infinite RLS recursion between message_conversations and message_participants.
-- Participant checks must go through SECURITY DEFINER helpers that bypass RLS.

create or replace function public.is_message_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_conversation_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from public.message_participants p
      where p.conversation_id = p_conversation_id
        and p.party_type = 'user'
        and p.user_id = p_user_id
    );
$$;

create or replace function public.can_read_message_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_conversations c
    where c.id = p_conversation_id
      and (
        public.is_staff()
        or c.patient_user_id = auth.uid()
        or (
          c.organization_id is not null
          and public.is_provider_org_member(c.organization_id)
        )
        or public.is_message_conversation_participant(c.id, auth.uid())
      )
  );
$$;

grant execute on function public.is_message_conversation_participant(uuid, uuid) to authenticated;
grant execute on function public.can_read_message_conversation(uuid) to authenticated;

drop policy if exists "Participants read message conversations" on public.message_conversations;
create policy "Participants read message conversations"
  on public.message_conversations for select to authenticated
  using (
    public.is_staff()
    or patient_user_id = auth.uid()
    or (
      organization_id is not null
      and public.is_provider_org_member(organization_id)
    )
    or public.is_message_conversation_participant(id, auth.uid())
  );

drop policy if exists "Participants read message participants" on public.message_participants;
create policy "Participants read message participants"
  on public.message_participants for select to authenticated
  using (
    public.is_staff()
    or user_id = auth.uid()
    or public.can_read_message_conversation(conversation_id)
  );

drop policy if exists "Participants read messages" on public.message_messages;
create policy "Participants read messages"
  on public.message_messages for select to authenticated
  using (
    public.is_staff()
    or public.can_read_message_conversation(conversation_id)
  );

-- Keep insert policy, but use the definer helper for direct-thread membership.
drop policy if exists "Users insert own message replies" on public.message_messages;
create policy "Users insert own message replies"
  on public.message_messages for insert to authenticated
  with check (
    sender_party_type = 'user'
    and sender_user_id = auth.uid()
    and (
      exists (
        select 1
        from public.message_conversations c
        where c.id = conversation_id
          and c.kind = 'org_patient'
          and c.patient_user_id = auth.uid()
          and exists (
            select 1
            from public.patient_provider_connections x
            where x.organization_id = c.organization_id
              and x.patient_id = auth.uid()
              and x.status = 'approved'
          )
      )
      or (
        exists (
          select 1
          from public.message_conversations c
          where c.id = conversation_id
            and c.kind = 'direct'
        )
        and public.is_message_conversation_participant(conversation_id, auth.uid())
      )
    )
  );
