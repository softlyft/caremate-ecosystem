'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  createLocationAction,
  updateLocationAction,
} from '@/domains/catalog/actions';
import type { ProviderLocation } from '@/types/database';

export function LocationForm({
  location,
  mode,
}: {
  location?: ProviderLocation | null;
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
              const created = await createLocationAction(formData);
              toast.success('Location created');
              router.push(`/app/organization/locations/${created.id}`);
              router.refresh();
            } else if (location) {
              await updateLocationAction(location.id, formData);
              toast.success('Location saved');
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
          <FormField label="Location name" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={location?.name ?? ''} />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={location?.status ?? 'active'}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={location?.phone ?? ''} />
          </FormField>
          <FormField
            label="Claim contact email"
            htmlFor="email"
            hint="Same org-wide email used for claim. Only SoftLyft can change it before verification."
          >
            <Input
              id="email"
              type="email"
              readOnly
              disabled
              value={location?.email ?? ''}
              placeholder="Set by CareMate admin / ingest"
            />
          </FormField>
          <FormField label="Address" htmlFor="address" className="sm:col-span-2">
            <Input id="address" name="address" defaultValue={location?.address ?? ''} />
          </FormField>
          <FormField label="Latitude" htmlFor="latitude">
            <Input
              id="latitude"
              name="latitude"
              inputMode="decimal"
              defaultValue={location?.latitude ?? ''}
            />
          </FormField>
          <FormField label="Longitude" htmlFor="longitude">
            <Input
              id="longitude"
              name="longitude"
              inputMode="decimal"
              defaultValue={location?.longitude ?? ''}
            />
          </FormField>
        </div>

        <FormActions className="justify-start">
          <Button type="submit" loading={pending}>
            {mode === 'create' ? 'Create location' : 'Save location'}
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
