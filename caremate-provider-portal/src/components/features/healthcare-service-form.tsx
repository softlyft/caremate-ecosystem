'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ORG_TYPES, ORG_TYPE_LABELS } from '@/constants/org-types';
import {
  createServiceAction,
  updateServiceAction,
} from '@/domains/catalog/actions';
import type { ProviderHealthcareService, ProviderOrgType } from '@/types/database';

export function HealthcareServiceForm({
  locationId,
  service,
  mode,
}: {
  locationId: string;
  service?: ProviderHealthcareService | null;
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
              const created = await createServiceAction(formData);
              toast.success('Service created');
              router.push(
                `/app/organization/locations/${created.locationId}/services/${created.id}`,
              );
              router.refresh();
            } else if (service) {
              await updateServiceAction(service.id, formData);
              toast.success('Service saved');
              router.refresh();
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Save failed');
          }
        });
      }}
    >
      <input type="hidden" name="location_id" value={locationId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Service name</Label>
          <Input id="name" name="name" required defaultValue={service?.name ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service_type">Service type</Label>
          <Select
            id="service_type"
            name="service_type"
            defaultValue={service?.service_type ?? ''}
          >
            <option value="">Select type…</option>
            {ORG_TYPES.map((t: ProviderOrgType) => (
              <option key={t} value={t}>
                {ORG_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="active">Active</Label>
          <Select
            id="active"
            name="active"
            defaultValue={service?.active === false ? 'false' : 'true'}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
      </div>

      <Button type="submit" loading={pending}>
        {mode === 'create' ? 'Create service' : 'Save service'}
      </Button>
    </form>
  );
}
