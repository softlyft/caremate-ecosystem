'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
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

      <FormStack>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Service name" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={service?.name ?? ''} />
          </FormField>
          <FormField label="Service type" htmlFor="service_type">
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
          </FormField>
          <FormField label="Active" htmlFor="active">
            <Select
              id="active"
              name="active"
              defaultValue={service?.active === false ? 'false' : 'true'}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </FormField>
        </div>

        <FormActions className="justify-start">
          <Button type="submit" loading={pending}>
            {mode === 'create' ? 'Create service' : 'Save service'}
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
