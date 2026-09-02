-- Care coordination inserts fail when the original inline kind check is still present:
--   message_conversations_kind_check  →  kind in ('org_patient', 'direct')
-- Later migrations added message_conversations_kind_shape with care_coordination
-- but never dropped the legacy column check.

alter table public.message_conversations
  drop constraint if exists message_conversations_kind_check;

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

comment on column public.message_conversations.kind is
  'org_patient (1:1 org↔patient), direct (user↔user), care_coordination (patient+provider+payer).';
