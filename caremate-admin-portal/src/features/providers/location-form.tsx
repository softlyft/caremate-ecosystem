'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  createLocationAction,
  updateLocationAction,
} from '@/domains/providers/actions';
import type { ProviderLocation } from '@/types/database';

export function LocationForm({
  organizationId,
  location,
  mode,
  contactEmail,
}: {
  organizationId: string;
  location?: ProviderLocation | null;
  mode: 'create' | 'edit';
  contactEmail?: string | null;
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
              const created = await createLocationAction(formData);
              toast.success('Location created');
              router.push(
                `/dashboard/providers/organizations/${created.organizationId}/locations/${created.id}`,
              );
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
      <input type="hidden" name="organization_id" value={organizationId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Location name</Label>
          <Input id="name" name="name" required defaultValue={location?.name ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={location?.status ?? 'active'}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={location?.phone ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Claim contact email</Label>
          <Input
            id="email"
            type="email"
            readOnly
            disabled
            value={location?.email ?? contactEmail ?? ''}
            placeholder="Set on organization page"
          />
          <p className="text-xs text-muted">
            Org-wide claim email. Edit on the organization page while unverified.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={location?.address ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            name="latitude"
            inputMode="decimal"
            defaultValue={location?.latitude ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            name="longitude"
            inputMode="decimal"
            defaultValue={location?.longitude ?? ''}
          />
        </div>
      </div>

      <Button type="submit" loading={pending}>
        {mode === 'create' ? 'Create location' : 'Save location'}
      </Button>
    </form>
  );
}
