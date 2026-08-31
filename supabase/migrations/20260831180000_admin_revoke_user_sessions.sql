-- Force-logout helpers for admin "Disable account".
-- Ban alone blocks new sign-in but does not delete existing sessions / refresh tokens.

create or replace function public.admin_revoke_user_sessions(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  -- Drop active sessions (refresh tokens typically cascade or become unusable).
  delete from auth.sessions
  where user_id = target_user_id;

  -- Belt-and-suspenders: mark any remaining refresh tokens revoked.
  update auth.refresh_tokens
  set revoked = true
  where user_id = target_user_id
    and coalesce(revoked, false) = false;
end;
$$;

revoke all on function public.admin_revoke_user_sessions(uuid) from public;
revoke all on function public.admin_revoke_user_sessions(uuid) from anon;
revoke all on function public.admin_revoke_user_sessions(uuid) from authenticated;
grant execute on function public.admin_revoke_user_sessions(uuid) to service_role;

comment on function public.admin_revoke_user_sessions(uuid) is
  'Service-role only. Revokes all Auth sessions/refresh tokens for a user (used when an admin disables/bans an account).';
