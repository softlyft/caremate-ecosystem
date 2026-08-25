-- Restrict payer-manager UPDATEs on payer_organizations to directory contact fields.
-- SoftLyft catalog editors (can_edit_catalog) retain full column access.

create or replace function public.protect_payer_organization_manager_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SoftLyft catalog editors / platform staff keep full UPDATE.
  if public.can_edit_catalog() or public.is_admin() or public.is_staff() then
    return new;
  end if;

  -- Payer managers may only dual-write phone / website / address (+ updated_at).
  if public.can_manage_payer_org(old.id) then
    if new.name is distinct from old.name
      or new.email is distinct from old.email
      or new.active is distinct from old.active
      or new.deleted_at is distinct from old.deleted_at
      or new.resource is distinct from old.resource
      or new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
    then
      raise exception
        'Payer managers may only update phone, website, and address on the catalog row';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.protect_payer_organization_manager_columns() is
  'Blocks payer managers from changing identity/archive fields on payer_organizations; SoftLyft catalog editors exempt.';

drop trigger if exists protect_payer_organization_manager_columns
  on public.payer_organizations;

create trigger protect_payer_organization_manager_columns
  before update on public.payer_organizations
  for each row
  execute function public.protect_payer_organization_manager_columns();
