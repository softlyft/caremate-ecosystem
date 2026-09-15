-- Federated Family Premium child access: linked adults can READ peer households'
-- children while an active Family subscription covers the shared household.
-- Writes stay restricted to true household members (no cross-household edits).

create or replace function public.can_read_family_peer_household(p_household_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with my_family_households as (
    select m.household_id as family_hh
    from public.family_members m
    where m.linked_user_id = auth.uid()
      and m.kind in ('self', 'spouse')
      and public.household_has_active_family_premium(m.household_id)
    union
    select h.id
    from public.family_households h
    where h.created_by_user_id = auth.uid()
      and public.household_has_active_family_premium(h.id)
  ),
  peer_users as (
    select distinct m.linked_user_id as user_id
    from public.family_members m
    where m.household_id in (select family_hh from my_family_households)
      and m.kind in ('self', 'spouse')
      and m.linked_user_id is not null
    union
    select h.created_by_user_id
    from public.family_households h
    where h.id in (select family_hh from my_family_households)
  )
  select exists (select 1 from my_family_households)
    and (
      p_household_id in (select family_hh from my_family_households)
      or exists (
        select 1
        from public.family_households th
        where th.id = p_household_id
          and th.created_by_user_id in (select user_id from peer_users)
      )
      or exists (
        select 1
        from public.family_members tm
        where tm.household_id = p_household_id
          and tm.kind = 'self'
          and tm.linked_user_id in (select user_id from peer_users)
      )
    );
$$;

comment on function public.can_read_family_peer_household(text) is
  'True when auth user shares an active Family Premium household with the owner/self-adult of the target household.';

revoke all on function public.can_read_family_peer_household(text) from public;
grant execute on function public.can_read_family_peer_household(text) to authenticated;

-- Split member policies: federated SELECT, membership-only writes.
drop policy if exists "Household members manage members" on public.family_members;

drop policy if exists "Household members read members" on public.family_members;
create policy "Household members read members"
  on public.family_members for select
  to authenticated
  using (
    public.is_household_member(household_id)
    or public.can_read_family_peer_household(household_id)
  );

drop policy if exists "Household members insert members" on public.family_members;
create policy "Household members insert members"
  on public.family_members for insert
  to authenticated
  with check (
    (
      exists (
        select 1 from public.family_households h
        where h.id = household_id and h.created_by_user_id = auth.uid()
      )
      or public.is_household_member(household_id)
      or linked_user_id = auth.uid()
    )
    -- Family Premium: only the plan owner may add children (federation is read-only).
    and (
      kind is distinct from 'child'
      or not public.household_has_active_family_premium(household_id)
      or exists (
        select 1 from public.family_households h
        where h.id = household_id and h.created_by_user_id = auth.uid()
      )
    )
  );

drop policy if exists "Household members update members" on public.family_members;
create policy "Household members update members"
  on public.family_members for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) or linked_user_id = auth.uid());

drop policy if exists "Household members delete members" on public.family_members;
create policy "Household members delete members"
  on public.family_members for delete
  to authenticated
  using (public.is_household_member(household_id));

-- Allow SELECT on peer households (metadata) while Family Premium is shared.
drop policy if exists "Household members manage households" on public.family_households;

drop policy if exists "Household members read households" on public.family_households;
create policy "Household members read households"
  on public.family_households for select
  to authenticated
  using (
    created_by_user_id = auth.uid()
    or public.is_household_member(id)
    or public.can_read_family_peer_household(id)
  );

drop policy if exists "Household owners update households" on public.family_households;
create policy "Household owners update households"
  on public.family_households for update
  to authenticated
  using (created_by_user_id = auth.uid())
  with check (created_by_user_id = auth.uid());

drop policy if exists "Household owners delete households" on public.family_households;
create policy "Household owners delete households"
  on public.family_households for delete
  to authenticated
  using (created_by_user_id = auth.uid());
