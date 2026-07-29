'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      className="space-y-4"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Organization name</Label>
          <Input id="name" name="name" required defaultValue={organization?.name ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="active">Active</Label>
          <Select
            id="active"
            name="active"
            defaultValue={organization?.active === false ? 'false' : 'true'}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
      </div>
      <Button type="submit" loading={pending}>
        {mode === 'create' ? 'Create organization' : 'Save organization'}
      </Button>
    </form>
  );
}
