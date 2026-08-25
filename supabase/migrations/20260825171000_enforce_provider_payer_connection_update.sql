-- Tighten provider↔payer connection UPDATEs:
-- - Approving side may approve only when initiated_by is the other party
-- - Either write side may reject/cancel pending (with rejection_reason)
-- - Org FKs and initiated_by are immutable after insert

create or replace function public.enforce_provider_payer_connection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_provider boolean := public.can_write_provider_org(old.provider_organization_id) or public.is_admin();
  v_can_payer boolean := public.can_write_payer_org(old.payer_organization_id) or public.is_admin();
begin
  if new.provider_organization_id is distinct from old.provider_organization_id
    or new.payer_organization_id is distinct from old.payer_organization_id
    or new.initiated_by is distinct from old.initiated_by
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cannot change provider/payer identity or initiated_by on a connection';
  end if;

  if old.status is distinct from 'pending' then
    raise exception 'Only pending connections can be updated';
  end if;

  if new.status = 'approved' then
    if old.initiated_by = 'provider' then
      -- Payer (or admin) must approve provider-initiated requests
      if not v_can_payer then
        raise exception 'Only the payer organization can approve this request';
      end if;
    elsif old.initiated_by = 'payer' then
      if not v_can_provider then
        raise exception 'Only the provider organization can approve this request';
      end if;
    else
      raise exception 'Invalid initiated_by';
    end if;

    if new.rejection_reason is not null then
      raise exception 'Approved connections cannot include a rejection reason';
    end if;

    new.approved_at := coalesce(new.approved_at, now());
    new.rejected_at := null;

  elsif new.status = 'rejected' then
    if not (v_can_provider or v_can_payer) then
      raise exception 'Not authorized to reject this connection';
    end if;

    if nullif(btrim(coalesce(new.rejection_reason, '')), '') is null then
      raise exception 'A rejection reason is required';
    end if;

    new.rejected_at := coalesce(new.rejected_at, now());
    new.approved_at := null;

  elsif new.status = 'pending' then
    -- Allow note edits on pending only by a write role on either side
    if not (v_can_provider or v_can_payer) then
      raise exception 'Not authorized to update this connection';
    end if;
  else
    raise exception 'Invalid connection status';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.enforce_provider_payer_connection_update() is
  'Enforces initiated_by approve rules, rejection_reason on reject, and immutable org FKs.';

drop trigger if exists enforce_provider_payer_connection_update
  on public.provider_payer_connections;

create trigger enforce_provider_payer_connection_update
  before update on public.provider_payer_connections
  for each row
  execute function public.enforce_provider_payer_connection_update();

-- Also require rejection_reason at the table level when rejected
alter table public.provider_payer_connections
  drop constraint if exists provider_payer_connections_rejection_reason_chk;

alter table public.provider_payer_connections
  add constraint provider_payer_connections_rejection_reason_chk
  check (
    status <> 'rejected'
    or nullif(btrim(coalesce(rejection_reason, '')), '') is not null
  );
