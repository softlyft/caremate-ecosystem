'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      className="space-y-4"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Organization name</Label>
          <Input id="name" name="name" required defaultValue={organization?.name ?? ''} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Claim contact email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={organization?.email ?? ''}
            placeholder="Used for Care Portal claim matching"
          />
          <p className="text-xs text-muted">
            SoftLyft-seeded contact email. Payers claim via Care Portal using this address.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={organization?.phone ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={organization?.website ?? ''} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={organization?.address ?? ''} />
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
