'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { updateOrganizationContactEmailAction } from '@/domains/providers/actions';

export function OrganizationContactEmailForm({
  organizationId,
  email,
  verified,
  canEdit,
}: {
  organizationId: string;
  email: string | null;
  verified: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const locked = verified || !canEdit;

  if (locked) {
    return (
      <FormField label="Claim contact email">
        <p className="text-sm font-medium">{email?.trim() || '—'}</p>
        <p className="text-xs text-muted">
          {verified
            ? 'Locked after verification. Providers and staff cannot change it.'
            : 'You do not have permission to edit this email.'}
        </p>
      </FormField>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await updateOrganizationContactEmailAction(organizationId, formData);
            toast.success('Claim contact email updated on profile and all locations');
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Update failed');
          }
        });
      }}
    >
      <FormField
        label="Claim contact email"
        htmlFor="email"
        hint="Unique org email used for claim. Editable only while unverified; syncs to every location."
      >
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={email ?? ''}
          placeholder="org@example.com"
        />
      </FormField>
      <FormActions className="mt-3 justify-start">
        <Button type="submit" size="sm" loading={pending}>
          Save email
        </Button>
      </FormActions>
    </form>
  );
}
