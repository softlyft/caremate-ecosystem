'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormActions, FormField } from '@/components/ui/form-field';
import { DetailRow } from '@/components/ui/detail-row';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import { markAsStaffAction } from '@/domains/members/actions';
import type { ProviderMemberRole } from '@/types/database';

export type OrgStaffMembership = {
  user_id: string;
  role: ProviderMemberRole | string;
  display_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  position: string | null;
};

type MarkAsStaffAction = typeof markAsStaffAction;

export function MarkAsStaffForm({
  patientUserId,
  defaultDisplayName,
  membership,
  canManage,
  markAction = markAsStaffAction,
  positionPlaceholder = 'e.g. Nurse, Pharmacist',
}: {
  patientUserId: string;
  defaultDisplayName: string;
  membership: OrgStaffMembership | null;
  canManage: boolean;
  markAction?: MarkAsStaffAction;
  positionPlaceholder?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const isStaff = Boolean(membership);

  if (!canManage && !isStaff) {
    return null;
  }

  const roleLabel =
    membership &&
    (PROVIDER_ROLE_LABELS[membership.role as ProviderMemberRole] ?? membership.role);

  if (isStaff && membership) {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium text-foreground">Staff · {roleLabel}</p>
        <div className="space-y-2">
          <DetailRow label="Display name" value={membership.display_name ?? '—'} />
          <DetailRow label="Position" value={membership.position ?? '—'} />
          <DetailRow label="Company email" value={membership.company_email ?? '—'} />
          <DetailRow label="Company phone" value={membership.company_phone ?? '—'} />
        </div>
        {canManage ? (
          <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : 'Update staff details'}
          </Button>
        ) : null}
        {open && canManage ? (
          <StaffFieldsForm
            patientUserId={patientUserId}
            defaultDisplayName={membership.display_name ?? defaultDisplayName}
            defaults={membership}
            pending={pending}
            positionPlaceholder={positionPlaceholder}
            submitLabel="Save staff details"
            onSubmit={(formData) => {
              startTransition(async () => {
                try {
                  await markAction(formData);
                  toast.success('Staff details updated');
                  setOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not update staff');
                }
              });
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Connected CareMate users can be elevated to organization staff. They keep the same app
        login; optional workplace contact fields are for your team records.
      </p>
      {!open ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          Mark as staff
        </Button>
      ) : (
        <StaffFieldsForm
          patientUserId={patientUserId}
          defaultDisplayName={defaultDisplayName}
          pending={pending}
          positionPlaceholder={positionPlaceholder}
          submitLabel="Confirm mark as staff"
          onCancel={() => setOpen(false)}
          onSubmit={(formData) => {
            startTransition(async () => {
              try {
                await markAction(formData);
                toast.success('Marked as staff');
                setOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Could not mark as staff');
              }
            });
          }}
        />
      )}
    </div>
  );
}

function StaffFieldsForm({
  patientUserId,
  defaultDisplayName,
  defaults,
  pending,
  submitLabel,
  positionPlaceholder,
  onSubmit,
  onCancel,
}: {
  patientUserId: string;
  defaultDisplayName: string;
  defaults?: Pick<
    OrgStaffMembership,
    'display_name' | 'company_email' | 'company_phone' | 'position'
  > | null;
  pending: boolean;
  submitLabel: string;
  positionPlaceholder: string;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
}) {
  return (
    <form
      className="space-y-3 rounded-md border border-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <input type="hidden" name="patient_user_id" value={patientUserId} />
      <Field
        id="display_name"
        name="display_name"
        label="Display name"
        defaultValue={defaults?.display_name ?? defaultDisplayName}
        disabled={pending}
      />
      <Field
        id="position"
        name="position"
        label="Position"
        placeholder={positionPlaceholder}
        defaultValue={defaults?.position ?? ''}
        disabled={pending}
      />
      <Field
        id="company_email"
        name="company_email"
        label="Company email"
        type="email"
        placeholder="name@organization.com"
        defaultValue={defaults?.company_email ?? ''}
        disabled={pending}
      />
      <Field
        id="company_phone"
        name="company_phone"
        label="Company phone"
        type="tel"
        defaultValue={defaults?.company_phone ?? ''}
        disabled={pending}
      />
      <FormActions>
        {onCancel ? (
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="sm" loading={pending} loadingLabel="Saving…">
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  defaultValue,
  disabled,
  placeholder,
  type = 'text',
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <FormField compact label={label} htmlFor={id}>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder={placeholder}
      />
    </FormField>
  );
}
