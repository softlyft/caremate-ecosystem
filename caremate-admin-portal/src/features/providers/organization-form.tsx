'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  createOrganizationAction,
  updateOrganizationAction,
} from '@/domains/providers/actions';
import type { ProviderOrganization } from '@/types/database';

export function OrganizationForm({
  organization,
  mode,
}: {
  organization?: ProviderOrganization | null;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            if (mode === 'create') {
              const created = await createOrganizationAction(formData);
              toast.success('Organization created');
              router.push(`/dashboard/providers/organizations/${created.id}`);
              router.refresh();
            } else if (organization) {
              await updateOrganizationAction(organization.id, formData);
              toast.success('Organization saved');
              router.refresh();
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Save failed');
          }
        });
      }}
    >
      <FormStack>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Organization name" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={organization?.name ?? ''} />
          </FormField>
          <FormField label="Active" htmlFor="active">
            <Select
              id="active"
              name="active"
              defaultValue={organization?.active === false ? 'false' : 'true'}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </FormField>
        </div>
        <FormActions className="justify-start">
          <Button type="submit" loading={pending}>
            {mode === 'create' ? 'Create organization' : 'Save organization'}
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
