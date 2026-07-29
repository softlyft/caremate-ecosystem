'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PROVIDER_TYPES, PROVIDER_TYPE_LABELS } from '@/constants/content';
import {
  createServiceAction,
  updateServiceAction,
} from '@/domains/providers/actions';
import type { ProviderHealthcareService } from '@/types/database';

export function HealthcareServiceForm({
  organizationId,
  locationId,
  service,
  mode,
}: {
  organizationId: string;
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
                `/dashboard/providers/organizations/${created.organizationId}/locations/${created.locationId}/services/${created.id}`,
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
      <input type="hidden" name="organization_id" value={organizationId} />
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
            {PROVIDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROVIDER_TYPE_LABELS[t]}
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
