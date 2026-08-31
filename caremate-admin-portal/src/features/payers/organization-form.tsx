'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  createPayerOrganizationAction,
  updatePayerOrganizationAction,
} from '@/domains/payers/actions';
import type { PayerOrganization } from '@/types/database';

export function PayerOrganizationForm({
  organization,
  mode,
}: {
  organization?: PayerOrganization | null;
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
              const created = await createPayerOrganizationAction(formData);
              toast.success('Health insurance organization created');
              router.push(`/dashboard/payers/${created.id}`);
              router.refresh();
            } else if (organization) {
              await updatePayerOrganizationAction(organization.id, formData);
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
          <FormField
            label="Claim contact email"
            htmlFor="email"
            className="sm:col-span-2"
            hint="SoftLyft-seeded contact email. Payers claim via Care Portal using this address."
          >
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={organization?.email ?? ''}
              placeholder="Used for Care Portal claim matching"
            />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={organization?.phone ?? ''} />
          </FormField>
          <FormField label="Website" htmlFor="website">
            <Input id="website" name="website" defaultValue={organization?.website ?? ''} />
          </FormField>
          <FormField label="Address" htmlFor="address" className="sm:col-span-2">
            <Input id="address" name="address" defaultValue={organization?.address ?? ''} />
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
